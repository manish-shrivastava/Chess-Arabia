var sys = require("sys");
var io = require('socket.io').listen(8080);
var underscore = require('./underscore.js');

io.configure(function () {
  io.set('transports', ['websocket', 'flashsocket', 'xhr-polling']);
  io.set('log level', 2);
});

// REDIS
var redis = require("./redis-node/lib/redis");
redis_client = redis.createClient();    // Create the client
redis_client2 = redis.createClient();    // Create the client to subscribe to move_finished channel
redis_client3 = redis.createClient();    // Create the client to subscribe to player_joined
redis_client4 = redis.createClient();    // Create the client to subscribe to game_started
redis_client5 = redis.createClient();    // Create the client to subscribe to game_created
redis_client6 = redis.createClient();    // Create the client to subscribe to game_finished

var games = {};
var client_games = {};
var game_resign = {};
var last_move = {};
var homepage_clients = [];

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

function game_resigned(game){
  console.log(game.id);
  var game_clients = games[game.id];
  game.winner = 'Resign' + game.turn;
  redis_client.set("game_" + game.id, JSON.stringify(game));
  redis_client.lrem('games', 1, game.id);
  redis_client.publish('game_finished', game.id);
  underscore.each(game_clients, function(c){
    resigned_msg = { resigned: game.winner };
    c.send(JSON.stringify(resigned_msg));
  });
}

redis_client6.subscribeTo('game_finished', function(err, game_id){
  underscore.each(homepage_clients, function(c){
    c.send(JSON.stringify({ 'game_finished': game_id }));
  });
});

redis_client5.subscribeTo('game_created', function(err, game_json){
  var game = JSON.parse(game_json);
  underscore.each(homepage_clients, function(c){
    c.send(JSON.stringify({ 'game_created': game }));
  });
});

redis_client2.subscribeTo('move_finished', function(err, game_id){
  console.log('Move Finished in ' + game_id);
  var game_key = "game_" + game_id;
  redis_client.get(game_key, function(err, data){

    var game_json = data;
    var game = JSON.parse(game_json);
    var game_clients = games[game_id];
    var game_state = { turn: game.turn, next_moves: game.next_moves, winner: game.winner };
    var to_move_msg = { make_move: game.moves[game.moves.length - 1], game_state: game_state };
    clearTimeout(game_resign[game.id]);
    if ( ! game.winner) {
      game_resign[game.id] = setTimeout(function(){ game_resigned(game); }, 120500);
      last_move[game.id] = new Date();
    }
    underscore.each(game_clients, function(c){
      c.send(JSON.stringify(to_move_msg));
    });
  });
});

redis_client3.subscribeTo('player_joined', function(err, info_jsoned){
  var info = JSON.parse(info_jsoned);
  info.msg_type = 'player_joined';
  var game_id = info.game_id;
  var game_clients = games[game_id];
  underscore.each(game_clients, function(client){
    client.send(JSON.stringify(info));
  });
  underscore.each(homepage_clients, function(client){
    client.send(JSON.stringify(info));
  });

});

redis_client4.subscribeTo('game_started', function(err, game_id){
  console.log('Game Started ' + game_id);
  var game_key = "game_" + game_id;
  var game;
  redis_client.get(game_key, function(err, data){
    var game_json = data;
    game = JSON.parse(game_json);
    game_resign[game.id] = setTimeout(function(){ game_resigned(game); }, 121000);
    last_move[game.id] = new Date();
  });

  underscore.each(homepage_clients, function(c){
    c.send(JSON.stringify({ 'game_started': game }));
  });

});


io.sockets.on('connection', function (client) {
  client_games[client] = [];
  io.sockets.emit('this', { will: 'be received by everyone'} );

  client.on('follow_game', function(game_id){
    client_games[client].push(game_id);
    games[game_id] = games[game_id] || [];
    games[game_id].push(client);
    var game_key = "game_" + game_id;
    redis_client.get(game_key, function(err, data){
      //console.log("GAME DATA" + data);
      var game = JSON.parse(data);
      return_hash = {load_game: game_id, turn: game.turn, players: game.players, cells: game.cells};
      return_hash.next_moves = game.next_moves;
      return_hash.last_rendered_move = game.moves.length - 1;
      return_hash.moves = game.moves;
      return_hash.winner = game.winner;
      return_hash.eaten_pieces = game.eaten_pieces;
      return_hash.last_move = (120 - parseInt(((new Date()) - last_move[game.id])/ 1000));
      client.send(JSON.stringify(return_hash));
    });
  });

  client.on('follow_games', function(){
    homepage_clients.push(client);
  });

  client.on('send_chat', function(game_id, chat_line, player_name){
    if (chat_line) {
      game_clients = games[game_id];
      underscore.each(game_clients, function(c){
        c.send(JSON.stringify({ chat_line: "<b>" + player_name + "</b>" + ": " + chat_line }));
      });
    }
  });

  client.on('disconnect', function () {
    io.sockets.emit('user disconnected');
  });
});
