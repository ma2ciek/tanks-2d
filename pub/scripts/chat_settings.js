/****************************CHAT*********************************/
var chat = {
	message: function(msg) {
		$('#messages').append('<li><span></span></li>').find('li:last-child').text(msg);
		chat.animate();
	},
	neutral_message: function(msg) {
		$('#messages').append('<li class="neutral"></li>').find('li:last-child').text(msg);
		chat.animate();
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


/**************************SETTINGS*******************************/
var settings = {
	isOpen: 0,
	toggle: function() {
		(settings.isOpen == 1) ? settings.close(): settings.open()
	},
	open: function() {
		settings.isOpen = 1;
		$('div#settings').show();		
	},
	close: function() {
		settings.isOpen = 0;
		$('#settings').hide(0);
	},
	load: function() {
		for (var i in this.options) {
			var s = this.options[i]
			var x = localStorage.getItem(i) || this.options[i].def;
			s.settings_parent[s.settings_attr] = s.format.call(this, x);

			$('#' + i).off().on('change keydown', function(ev) {
				var id = ev.target.id;
				var o = settings.options[id];
				var val = o.format.call(this, $('#' + id).val());
				o.settings_parent[o.settings_attr] = val;
				localStorage.setItem(id, val);
			}).val(x);
		}
	},
	options: {
		game_delay: {
			settings_parent: game,
			settings_attr: 'delay',
			def: 100,
			format: parseInt
		},
		sound_volume: {
			settings_parent: game,
			settings_attr: 'volume',
			def: 0.5,
			format: parseFloat
		}
	}
}
