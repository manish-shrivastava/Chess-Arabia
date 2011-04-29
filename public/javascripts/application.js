function show_change_guest_name_dialog(){
  $('#set_guest_name').dialog({ width: 640, height: 400, buttons: { 'إلغاء الأمر': function(){ $("#name").attr('value', player_name); $('#set_guest_name').dialog('close') }, 'تعديل': function(){ $("#set_guest_name form").submit(); $('#set_guest_name').dialog('close'); } } });
}

$(function(){
  $.ajaxSetup({ "beforeSend": function(xhr) { var token = $("meta[name='csrf-token']").attr("content"); xhr.setRequestHeader("X-CSRF-Token", token); } });
});

function show_flash(msg){
  alert(msg);
}

$(function(){
  if (guest) {
    $('#set_guest_name_link').click(function(event){ show_change_guest_name_dialog(); event.preventDefault(); });
  }
});
