/*
function show_change_guest_name_dialog(){
  $('#set_guest_name').dialog({ width: 640, height: 400, buttons: { 'إلغاء الأمر': function(){ $("#name").attr('value', player_name); $('#set_guest_name').dialog('close') ; }, 'تعديل': function(){ $("#set_guest_name form").submit(); $('#set_guest_name').dialog('close'); } } });
}
*/

$(function(){
  $.ajaxSetup({ "beforeSend": function(xhr) { var token = $("meta[name='csrf-token']").attr("content"); xhr.setRequestHeader("X-CSRF-Token", token); } });
});

function show_message(msg, title){
  $('#msg_dialog').html(msg);
  title = title || "Message";
  $('#msg_dialog').dialog({ 'modal': true, 'buttons': { 'Close': function(){ $(this).dialog('close'); }}, 'title': title });
}

function show_top_message(msg, time){
  $('#top_msg_container').html('<p>' + msg + '</p>');
  $('#top_msg_container').hide();
  $('#top_msg_container').slideDown();
  if (time > 0){
    setTimeout(function(){ $('#top_msg_container').slideUp('slow'); }, time);
  }
}

$(function(){
  if (guest) {
    //$('#set_guest_name_link').click(function(event){ show_change_guest_name_dialog(); event.preventDefault(); });
  }
});
