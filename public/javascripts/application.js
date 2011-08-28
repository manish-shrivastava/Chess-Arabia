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

top_message_timeout = 0;

function show_top_message(msg, time){
  clearTimeout(top_message_timeout);
  $('#top_msg_container').html('<p>' + msg + '</p>');
  $('#top_msg_container p').hide();
  $('#top_msg_container p').slideDown();
  if (time > 0){
    top_message_timeout = setTimeout(function(){ $('#top_msg_container p').slideUp('slow'); }, time);
  }
}

$(function(){
  if (guest) {
    //$('#set_guest_name_link').click(function(event){ show_change_guest_name_dialog(); event.preventDefault(); });
  }
});


var soundEmbed = null;
function soundPlay(which)
{
  if (!soundEmbed)
  {
    soundEmbed = document.createElement("embed");
    soundEmbed.setAttribute("src", "/snd/"+which+".wav");
    soundEmbed.setAttribute("hidden", true);
    soundEmbed.setAttribute("autostart", true);
  }
  else
  {
    document.body.removeChild(soundEmbed);
    soundEmbed.removed = true;
    soundEmbed = null;
    soundEmbed = document.createElement("embed");
    soundEmbed.setAttribute("src", "/snd/"+which+".wav");
    soundEmbed.setAttribute("hidden", true);
    soundEmbed.setAttribute("autostart", true);
  }
  soundEmbed.removed = false;
  document.body.appendChild(soundEmbed);
}

