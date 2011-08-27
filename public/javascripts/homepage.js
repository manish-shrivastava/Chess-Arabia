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
  else if (msg.game_finished){
    $('#game_' + msg.game_finished).remove();
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

  $('.game_item').live('click', function(event){
    game_id = $(this).attr('id').match(/\d+/)[0];
    document.location = '/games/' + game_id;
  });

  _.each(pending_games, function(game){
    render_not_started_game_item(game);
  });

  _.each(started_games, function(game){
    render_started_game_item(game);
  });


  $('a.games_room').click(function(){
    $('#homepage').slideUp('fast');
    $('#games_index').fadeIn('slow');
  });

  $('a.homepage').click(function(){
    $('#games_index').hide();
    $('#homepage').slideDown();
  });

  if (document.location.hash == '#games'){
    $('#homepage').slideUp('fast');
    $('#games_index').fadeIn('slow');
  }
});
