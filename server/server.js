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

// socket.io, I choose you
// simplest chat application evar
var io = io.listen(server)
  , buffer = [];

var games = [];

redis_client2.subscribeTo('move_finished', function(err, game_id){
  game_key = "game_" + game_id;
  game_json = redis_client.get(game_key, function(err, data){ 
    game_json = data;
    game = JSON.parse(game_json);
    game_clients = games[game_id];
    game_state = { turn: game.turn, next_moves: game.next_moves, winner: game.winner }
    to_move_msg = { make_move: game.moves[game.moves.length - 1], game_state: game_state }
    underscore.each(game_clients, function(client){
      client.send(JSON.stringify(to_move_msg));
    });
  }); 
});

redis_client3.subscribeTo('player_joined', function(err, info_jsoned){
  info = JSON.parse(info_jsoned);
  info.msg_type = 'player_joined';
  game_id = info.game_id;
  game_clients = games[game_id];
  underscore.each(game_clients, function(client){
    client.send(JSON.stringify(info));
  });
});
  
io.on('connection', function(client){
  //client.broadcast({ announcement: client.sessionId + ' connected' });
  
  client.on('message', function(message){
    //client.sessionId

    msg = JSON.parse(message);
    if (msg.follow_game){
      games[msg.follow_game] = games[msg.follow_game] || [];
      games[msg.follow_game].push(client);
      client.send(JSON.stringify({toAlert: "OMAR !"}));
      underscore.each(games[msg.follow_game], function(game_client){ game_client.send(JSON.stringify({toAlert: "OMAR !!"})) });
    }
    else if (msg.join_game) {
      key = "game_" + msg.join_game;
      game_json = redis_client.get(key, function(err, data){ 
        game_json = data;
        game = JSON.parse(game_json);
        game.players['W'] = msg.player_code;
        redis_client.set(key, JSON.stringify(game));
      });
    }

  });

  client.on('disconnect', function(){
    //client.broadcast({ announcement: client.sessionId + ' disconnected' });
  });
});
