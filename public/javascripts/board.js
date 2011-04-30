function msg_received(msg){
  if (msg.make_move){
    make_move(msg.make_move, function(){
      game_state = msg.game_state;
      current_turn = game_state.turn;
      next_moves = game_state.next_moves;
      if (game_state.winner){ game_finished(game_state.winner, true); }    
    });
  }
  else if (msg.msg_type == 'player_joined'){
    if (msg.seat == 'W'){
      $('#white_panel .player_name').html(msg.player_name);
    } else if (msg.seat == 'B'){
      $('#black_panel .player_name').html(msg.player_name);
    }
    if (msg.started == '1'){
      game_started(true);
    }
  }
}

function game_started(now){
  // Event Handler
  // now means Just Started
  started = 1;
  if (player_seat == 'W' || player_seat == 'B'){
    player_seat_down = player_seat.toLowerCase();
    selector = '.' + player_seat_down + 'piece';
    $(selector).draggable({ containment: "parent", stop: drag_stopped, start: function(event, ui){ $(event.target).css('z-index', 2); $(event.target).removeClass('hoverable'); } });
    $(selector).addClass('hoverable');
    $(selector).click(piece_clicked);
  }
}

function game_finished(winner, now){
  // Event Handler
  // now means Just Finished
  finished = winner;
  if (now){

  }
}

$(function(){
  render_cells();
  socket = new io.Socket(null, {port: 8080, rememberTransport: false});
  socket.connect();
  socket.on('connect', function(){ }) 
  socket.on('message', function(data){ msg_received($.parseJSON(data)); }) 
  socket.on('disconnect', function(){alert("Disconnect"); }) 

  socket.send($.toJSON({follow_game: game_id}));

  render_pieces();
  if (current_turn == 'replaceW' && player_seat == 'W'){ show_replace_white() }
  if (current_turn == 'replaceB' && player_seat == 'B'){ show_replace_black() }


  if (started){
    game_started(false); 
  } 
  if (finished){
    game_finished(finished, false); 
  }  
});

function black(){
  return player_seat == 'B';
}

function show_last_moved_from(place){
  ind = place[0].toString() + place[1].toString();
  $('.cell').removeClass("last_moved_from");
  board_cells[ind].addClass('last_moved_from');
}
     
function show_last_moved(place){
  ind = place[0].toString() + place[1].toString();
  $('.cell').removeClass("last_moved");
  board_cells[ind].addClass('last_moved');
}

function your_turn(){
  return (player_seat == current_turn);
}

function eat_piece(img){
  if (img){
    img.animate({ opacity: 0 }).remove();
  }
}
      
function animate_piece(from, to, callback){
  img = pieces[from[0]][from[1]];
  piece = cells[from[0]][from[1]];
  piece2 = cells[to[0]][to[1]];
  img.css('z-index', 1);

  if (piece2){
    img2 = pieces[to[0]][to[1]];
  } else {
    img2 = null;
  }
  if (!callback){ callback = function(){}; }
  location2 = location_of_piece(to);
  img.animate({ top: location2[0], left: location2[1] }, {complete: function(){img.css('z-index', 0); eat_piece(img2); callback(); }});
}

function location_of_piece(place){
  if (black()){
    return [47 * 7 - place[0] * 47, 47 * 7 - place[1] * 47];
  } else {
    return [place[0] * 47, place[1] * 47];
  }
}

function render_pieces(){
  $.each(cells, function(row_ind, row){
    pieces[row_ind] = {}
    $.each(row, function(col_ind, cell){
      if (cell){
        $('#board').append("<div class='piece' src='/images/pieces/" + cell + ".png' />");
        loc = location_of_piece([row_ind, col_ind])
        $('#board .piece').last().css('top', loc[0]);
        $('#board .piece').last().css('left', loc[1]);
        $('#board .piece').last().addClass(cell);
        pieces[row_ind][col_ind] = $('#board .piece').last();
        $('#board .piece').last().addClass(cell[1]);
        name = cell.substr(1, 1).toLowerCase() + "piece";
        $('#board .piece').last().addClass(name);              
        $('#board .piece').last().css('position', 'absolute');
      }
    });
  });
}

function add_chat_line(line, new_chat_length){
  chat = new_chat_length;
  $("#chat_lines").attr('value', new_chat_length);
  var line_div = $("<div>", { 'class': "chat_line" });
  line_div.addClass("highlighted");
  setTimeout(function(){ line_div.removeClass("highlighted"); }, 2000);
  line_div.html(line);
  $("#chat_box").append(line_div);
  $("#chat_box").attr({ scrollTop: $("#chat_box").attr("scrollHeight") });
}

function position_of_piece(piece){
  for( i = 0; i < 8; i++){
    for (j = 0; j < 8; j++){
      if (pieces[i][j] && pieces[i][j].index(piece) == 0){ return [i, j]; };
    }
  }
  //return null;
}

function piece_clicked(event){
  if (selected_cell){
  
  } else {
    position = position_of_piece($(event.target));
    //alert(position[0]);
  }
}

function select_cell(){

}

function select_no_cell(){
  selected_cell = null;
  
}

function send_move(from, to){
  if (your_turn()){
    $.ajax({
      url: "/games/" + game_id + "/move",
      data: "from=" + from[0].toString() + from[1].toString() + "&to=" + to[0].toString() + to[1].toString(),
      dataType: 'script',
      type: "POST"
    });          
  }
}

function legal(from, to){
  r = false;
  $.each(next_moves, function(ind, arr){
    from1 = arr['from'];
    to1 = arr['to'];
    if (from1[0] == from[0] && from1[1] == from[1] && to[0] == to1[0] && to[1] == to1[1]){ r = arr }
  });
  return r;
}

function make_move(move, callback){
  from = move['from'];
  to = move['to'];
  piece1 = move['piece1'];
  piece2 = move['piece2'];
  if ($.inArray(move['id'], rendered_moves) > -1){ return; }
  console.log("MAKING MOVE");
  rendered_moves.push(move['id']);
  $('#moves_list').append('<div class=\'move_list_element\'>' + move['standard'] + '</div>');
  special_move = move['special_move'];
  animate_piece(from, to, function(){
    if (piece2) { add_eaten_piece(piece2); }
    pieces[to[0]][to[1]] = pieces[from[0]][from[1]];
    pieces[from[0]][from[1]] = null;
    cells[to[0]][to[1]] = cells[from[0]][from[1]];
    cells[from[0]][from[1]] = null;
    $('.piece').removeClass('last_moved');
    show_last_moved(to);
    show_last_moved_from(from);
    if (special_move){make_special_move(move)};
    replace_piece = move['replace_piece'];
    if (replace_piece){
      make_replace_move(move);
    }
    callback();
  });
}

function make_replace_move(move){
  // Runs on Both Sides
  from = move['from'];
  to = move['to']
  piece1 = move['piece1'];
  piece2 = move['piece2'];
  replace_piece = move['replace_piece'];
  cells[to[0]][to[1]] = replace_piece;
  pieces[to[0]][to[1]].removeClass(piece1);
  pieces[to[0]][to[1]].addClass(replace_piece);
}

function make_special_move(move){
  from = move['from'];
  to = move['to'];       
  special_move_id = move['special_move'];
  if (special_move_id == 1){
    animate_piece(to, [to[0] - 1, to[1]]);
    cells[to[0] - 1][to[1]] = cells[to[0]][to[1]];
    cells[to[0]][to[1]] = null;
    pieces[(to[0] - 1)][to[1]] = pieces[to[0]][to[1]];
    pieces[to[0]][to[1]] = null;
  }
  else if (special_move_id == 2){
    animate_piece([to[0], to[1]], [to[0] + 1, to[1]]);
    cells[to[0] + 1][to[1]] = cells[to[0]][to[1]];
    cells[to[0]][to[1]] = null;
    pieces[(to[0] + 1)][to[1]] = pieces[to[0]][to[1]];
    pieces[to[0]][to[1]] = null;   
  }
  else if (special_move_id == 3){
    animate_piece([7, 7], [7, 5]);
    cells[7][5] = cells[7][7];
    cells[7][7] = null;
    pieces[7][5] = pieces[7][7];
    pieces[7][7] = null;        
  }
  else if (special_move_id == 4){
    animate_piece([7, 0], [7, 3]);
    cells[7][3] = cells[7][0];
    cells[7][0] = null;
    pieces[7][3] = pieces[7][0];
    pieces[7][0] = null;    
  }
  else if (special_move_id == 5){
    animate_piece([0, 7], [0, 5]);
    cells[0][5] = cells[0][7];
    cells[0][7] = null;
    pieces[0][5] = pieces[0][7];
    pieces[0][7] = null;        
  }
  else if (special_move_id == 6){
    animate_piece([0, 0], [0, 3]);
    cells[0][3] = cells[0][0];
    cells[0][0] = null;
    pieces[0][3] = pieces['00'];
    pieces['00'] = null;
  }
}    

function drag_stopped(event, ui){
  $(event.target).addClass('hoverable');
  all = ui;
  p = ui.position;
  // Top
  top_diff = (p.top % 47);
  if (top_diff > 47/2) top_shift = 47;
  else top_shift = 0;
  pp = 'z-index';
  $(event.target).css('top', p.top - (p.top % 47) + top_shift);
  $(event.target).css(pp, 0);  
  new_top = p.top - (p.top % 47) + top_shift;
  new_top = new_top / 47;
  
  // Left
  left_diff = (p.left % 47);
  if (left_diff > 47/2) left_shift = 47;
  else left_shift = 0;
  $(event.target).css('left', p.left - (p.left % 47) + left_shift);

  new_left = p.left - (p.left % 47) + left_shift;
  new_left = new_left / 47;

  old_left = ui.originalPosition.left / 47;
  old_top = ui.originalPosition.top / 47;
  
  from = [old_top, old_left];
  to = [new_top, new_left];
  if (from[0] == to[0] && from[1] == to[1]) return true;
  
  if (black()){
    from[0] = 7 - from[0]; from[1] = 7 - from[1];
    to[0] = 7 - to[0]; to[1] = 7 - to[1];
  }
  
  if (!piece_moved(from, to)){
    // Return the piece here
    loc = location_of_piece(from);
    piece_image.css('top', loc[0]);
    piece_image.css('left', loc[1]);
  }
}

function piece_moved(from, to){
  piece_image = pieces[from[0]][from[1]];
  legal_move = legal(from, to);
  piece = cells[from[0]][from[1]];
  piece2 = cells[to[0]][to[1]];        
  if ( !your_turn() || !started || finished || !legal_move ){
    return false;                
  }

  // It's 100% Legal
  cells[from[0]][from[1]] = null;
  cells[to[0]][to[1]] = piece;        
  rendered_moves.push(legal_move.id);
  
  // Removing Piece2
  piece2_image = pieces[to[0]][to[1]];
  if (piece2_image){
    piece2_image.remove();
    add_eaten_piece(piece2);
  }
  
  pieces[to[0]][to[1]] = pieces[from[0]][from[1]];
  pieces[from[0]][from[1]] = null;

  show_last_moved_from(from);
  show_last_moved(to);

  if (! ( (to[0] == 0 && piece == 'pW') || (to[0] == 7 && piece == 'pB') )){
    moves += 1;
    send_move(from, to);
    $('#moves_list').append('<div class=\'move_list_element\'>' + legal_move['standard'] + '</div>')
    current_turn = current_turn == 'W' ? 'B' : 'W'
    // Special Moves
    special_move = legal_move['special_move'];
    if (special_move){
      make_special_move({'from': from, 'to': to, 'special_move': special_move});
    }
    
  } else {
    send_move(from, to);
  }
  return true;
}


function add_eaten_piece(piece){
  if (piece[1] == 'W'){
    $('#white_eaten_pieces').append("<img src='/images/pieces/" + piece + ".png' />");
  }
  else if (piece[1] == 'B'){
    $('#black_eaten_pieces').append("<img src='/images/pieces/" + piece + ".png' />");
  }
}

function render_cells(){
  for (var row = 0; row < 8; row++){
    for (var col = 0; col < 8; col++){
      $('#board').append("<div class='cell'></div>");
      $('.cell').last().addClass((row + col) % 2 == 0 ? 'white' : 'black');
      loc = location_of_piece(row.toString() + col);
      board_cells[row.toString() + col] = $('#board .cell').last();
      $('#board .cell').last().css('top', loc[0]);
      $('#board .cell').last().css('left', loc[1]);
      $('#board .cell').last().css('position', 'absolute');
    }
  }
}
