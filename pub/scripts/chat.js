// CHAT
var chat = {
	message: function(msg) {
		$('#messages').append('<li><span></span></li>').find('li:last-child span').text( msg );
		chat.scroll();
	},
	neutral_message: function(msg) {
		$('#messages').append('<li class="neutral"><span></span></li>').find('li:last-child span').text( msg );
		chat.scroll();
	},
	clients: function(msg) {
		$('#clients').text(msg);
	},
	submit: function() {
		if ($('#m').val() == "" && chat.isOpen == 1) {
			$('#chat').hide();
			chat.isOpen = 0;
		} else {
			socket.emit('message', $('#m').val());
			$('#messages').append('<li class="my"><span></span></li>').find('li:last-child span').text( $('#m').val() );
			$('#m').val('');
			chat.scroll(0);
		}
	},
	scroll: function (t) {
		$('#messages').animate({
			scrollTop: $('#messages')[0].scrollHeight - $('#messages').height()
		}, t || 100);
	},
	show: function () {
		chat.isOpen = 1;
		$('#chat').show();
		$('#m').focus();
	}, 
	close: function () {
		chat.isOpen = 0;
		$('#chat').hide();
		$('#m').blur();
	},
	isOpen: 0,
	isFocus: 0
}