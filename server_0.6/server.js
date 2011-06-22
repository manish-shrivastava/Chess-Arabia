/**
 * Important note: this application is not suitable for benchmarks!
 */

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('./socket.io/')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;
    
server = http.createServer(function(req, res){}),

send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(8080);

// REDIS
var sys = require("sys");
var redis = require("./redis-node/lib/redis");
redis_client = redis.createClient();    // Create the client
redis_client2 = redis.createClient();    // Create the client to subscribe to move_finished channel
redis_client3 = redis.createClient();    // Create the client to subscribe to player_joined
redis_client4 = redis.createClient();    // Create the client to subscribe to game_started

underscore = require('./underscore.js');

var io = io.listen(server)
  , buffer = [];

var games = {};
var client_games = {};
var game_resign = {};
var last_move = {};

function game_resigned(game){
  console.log(game.id);
  var game_clients = games[game.id];
  game.winner = 'resign' + game.turn;
  redis_client.set("game_" + game.id, JSON.stringify(game));
  redis_client.lrem('games', 1, game.id);
  underscore.each(game_clients, function(c){
    resigned_msg = { resigned: game.winner };
    c.send(JSON.stringify(resigned_msg));
  });  
}

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
      game_resign[game.id] = setTimeout(function(){ game_resigned(game); }, 121000);
      last_move[game.id] = new Date();
    }
    underscore.each(game_clients, function(c){
      console.log('Telling Client ' + c.sessionId + ' About Move in ' + game_key);
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
});

redis_client4.subscribeTo('game_started', function(err, game_id){
  console.log('Game Started ' + game_id);
  var game_key = "game_" + game_id;
  redis_client.get(game_key, function(err, data){
    var game_json = data;
    var game = JSON.parse(game_json);
    game_resign[game.id] = setTimeout(function(){ game_resigned(game); }, 121000);
    last_move[game.id] = new Date();
  });

});
  
io.on('connection', function(client){
  //client.broadcast({ announcement: client.sessionId + ' connected' });
  
  client_games[client] = [];
  
  client.on('message', function(message){
    //client.sessionId

    msg = JSON.parse(message);
    if (msg.follow_game){
      client_games[client].push(msg.follow_game);
      games[msg.follow_game] = games[msg.follow_game] || [];
      games[msg.follow_game].push(client);
      console.log("Client " + client.sessionId + " is connected to the game " + msg.follow_game);
      var game_key = "game_" + msg.follow_game;
      redis_client.get(game_key, function(err, data){
        //console.log("GAME DATA" + data);
        var game = JSON.parse(data);
        return_hash = {load_game: msg.follow_game, turn: game.turn, players: game.players, cells: game.cells};
        return_hash.next_moves = game.next_moves;
        return_hash.last_rendered_move = game.moves.length - 1;
        return_hash.moves = game.moves;
        return_hash.winner = game.winner;
        return_hash.eaten_pieces = game.eaten_pieces;
        return_hash.last_move = (120 - parseInt(((new Date()) - last_move[game.id])/ 1000));
        client.send(JSON.stringify(return_hash));
      });
    }
    else if (msg.chat_line) {
      game_clients = games[msg.game_id];
      underscore.each(game_clients, function(c){
        c.send(JSON.stringify({ chat_line: "<b>" + msg.player_name + "</b>" + ": " + msg.chat_line }));
      });
    }

  });

  client.on('disconnect', function(){
    underscore.each(client_games[client], function(game_id){
      games[game_id].splice(games[game_id].indexOf(client), 1);
    });
    client_games[client] = null;
    //client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});
