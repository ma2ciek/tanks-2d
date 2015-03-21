$(document).ready(function() {
	settings.load();
})




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
					$('#' + id).off().on('change keydown', function(ev) {
						var id = this.id;
						var o = settings.options[id];
						var val = o.format.call(this, $('#' + id).val());
						localStorage.setItem(id, val);
					}).val(x);
					break;
				case 'checkbox':
					x = (x == 'true')? 1 : 0;
					$('#' + id).off().on('change', function(ev) {
						var id = this.id;
						var o = settings.options[id];
						var val = $('#' + id).prop('checked');
						localStorage.setItem(id, val);
					}).prop('checked', x);
					break;
			}			
		}
	},
	options: {
		game_delay: {
			def: 100,
			format: parseInt
		},
		sound_volume: {
			def: 0.5,
			format: parseFloat
		},
		brak_trawy: {
			def: 0,
		}
	}
}