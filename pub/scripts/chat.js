// CHAT
var chat = {
	message: function(msg) {
		$('#messages').append('<li><span></span></li>').find('li:last-child').text(msg);
		chat.animate();
	},
	neutral_message: function(msg) {
		$('#messages').append('<li class="neutral"></li>').find('li:last-child').text(msg);
		chat.animate();
	},
	clients: function(msg) {
		$('#clients').text('Online: ' + msg);
	},
	submit: function() {
		if (!$('#chat').val() == "" && chat.isOpen == 1) {
			socket.emit('message', $('#chat').val());
			$('#messages').append('<li class="my"></li>').find('li:last-child').text($('#chat').val());
			$('#chat').val('');
			chat.animate(0);
		}
		chat.close();
	},
	animate: function(t) {
		$('#messages li:last-child').delay(10000).fadeOut('2000');
		$('#messages li:hidden').remove();
	},
	show: function() {
		chat.isOpen = 1;
		$('#chat').show().focus();
	},
	close: function() {
		chat.isOpen = 0;
		$('#chat').hide().blur();
	},
	isOpen: 0,
	isFocus: 0,
}