/****************************CHAT*********************************/
var chat = {
	load: function() { // chat events
		$('img.chat').click(chat.show);
		$('#chat').focus(function() {
			chat.isFocus = 1;
		}).blur(function() {
			$('#chat').hide();
			chat.isFocus = 0;
			chat.isOpen = 0;
		});
	},
	message: function(msg) {
		$('#messages').append('<li>').find('li:last-child').text(msg);
		chat.animate();
	},
	neutral_message: function(msg) {
		$('#messages').append('<li class="neutral">').find('li:last-child').text(msg);
		chat.animate();
	},
	submit: function() {
		if (!$('#chat').val() == "" && chat.isOpen == 1) {
			socket.emit('message', $('#chat').val());
			$('#messages').append('<li class="my">').find('li:last-child').text($('#chat').val());
			$('#chat').val('');
			chat.animate(0);
		}
		chat.close();
	},
	animate: function(t) {
		$('#messages li:last-child').delay(30000).fadeOut('2000');
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
	murders: function(msg) {
		$('#messages').append('<li class="killing">').find('li:last-child').text(msg[0] + ' zabił gracza ' + msg[1]);
		chat.animate();
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
		$('img.settings').click(settings.open);
		$('#exit_settings').click(settings.close);
		for (var id in this.options) {
			var s = this.options[id]
			var x = localStorage.getItem(id) || this.options[id].def;
			switch($('#' + id)[0].type) {
				case 'text':
				case 'range':
					s.settings_parent[s.settings_attr] = s.format.call(this, x);
					$('#' + id).off().on('change keydown', function(ev) {
						var id = this.id;
						var o = settings.options[id];
						var val = o.format.call(this, $('#' + id).val());
						o.settings_parent[o.settings_attr] = val;
						localStorage.setItem(id, val);
					}).val(x);
					break;
				case 'checkbox':
					x = (x == 'true')? 1 : 0;
					s.settings_parent[s.settings_attr] = x;
					$('#' + id).off().on('change', function(ev) {
						var id = this.id;
						var o = settings.options[id];
						var val = $('#' + id).prop('checked');
						o.settings_parent[o.settings_attr] = val;
						localStorage.setItem(id, val);
					}).prop('checked', x);
					break;
			}			
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
		},
		brak_trawy: {
			settings_parent: game,
			settings_attr: 'brak_trawy',
			def: 0,
		}
	}
}
