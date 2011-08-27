function render_not_started_game_item(game){
  div = $('<div>', { 'id': 'game_' + game.id, 'class': 'game_item' });
  div.append('<div class="info white_player">' + game.white_player_name + '</div>');
  div.append('<div class="info vs_label">vs</div>');
  div.append('<div class="info black_player">' + game.black_player_name + '</div>');
  div.append('<div class="clearer"></div>');
  $('#not_started_games').append(div);
};

function render_started_game_item(game){
  div = $('<div>', { 'id': 'game_' + game.id, 'class': 'game_item' });
  div.append('<div class="info white_player">' + game.white_player_name + '</div>');
  div.append('<div class="info vs_label">vs</div>');
  div.append('<div class="info black_player">' + game.black_player_name + '</div>');
  div.append('<div class="clearer"></div>');
  $('#started_games').append(div);
};


function msg_received(msg){
  if (msg.game_created){
    render_not_started_game_item(msg.game_created);
  }
  else if (msg.msg_type == 'player_joined'){
    seat = msg.seat;
    if (seat == 'W'){
      $('#game_' + msg.game_id + ' .white_player').html(msg.player_name);
    } else {
      $('#game_' + msg.game_id + ' .black_player').html(msg.player_name);
    }
    if (msg.started == '1'){
      $('#game_' + msg.game_id).appendTo('#started_games');
    }
  }
}

$(function(){
  socket = io.connect('http://127.0.0.1:8080');
  //show_connecting();
  socket.on('connect', function(){
    socket.emit('follow_games');
  });
  socket.on('message', function(data){ msg_received($.parseJSON(data)); });
  socket.on('disconnect', function(){
    // Disconnected
  });

  _.each(pending_games, function(game){
    render_not_started_game_item(game);
  });

  _.each(started_games, function(game){
    render_started_game_item(game);
  });


  $('a.games_room').click(function(){
    $('#games_index').fadeIn();
    $('#homepage').fadeOut();
  });

  $('a.homepage').click(function(){
    $('#games_index').fadeOut();
    $('#homepage').fadeIn();
  });

  if (document.location.hash == '#games'){
    $('#games_index').fadeIn();
    $('#homepage').fadeOut();
  }
});
