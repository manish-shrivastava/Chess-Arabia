/**
 * Important note: this application is not suitable for benchmarks!
 */

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('./socket.io/')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;
    
server = http.createServer(function(req, res){
  // your normal server code
  var path = url.parse(req.url).pathname;
  switch (path){
    case '/':
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<h1>Welcome. Try the <a href="/chat.html">chat</a> example.</h1>');
      res.end();
      break;
      
    case '/json.js':
    case '/chat.html':
      fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'})
        res.write(data, 'utf8');
        res.end();
      });
      break;
      
    default: send404(res);
  }
}),

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

underscore = require('./underscore.js');

var io = io.listen(server)
  , buffer = [];

var games = {};
var client_games = {};

redis_client2.subscribeTo('move_finished', function(err, game_id){
  console.log('Move Finished in ' + game_id);
  var game_key = "game_" + game_id;
  redis_client.get(game_key, function(err, data){

    var game_json = data;
    var game = JSON.parse(game_json);
    var game_clients = games[game_id];
    var game_state = { turn: game.turn, next_moves: game.next_moves, winner: game.winner }
    var to_move_msg = { make_move: game.moves[game.moves.length - 1], game_state: game_state }
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
