var options = {
	game_delay: {
		settings_parent: game,
		settings_attr: 'delay',
		def: 100,
		format: parseInt
	},
	sound_volume: {
		settings_parent: resources.audio.shot,
		settings_attr: 'volume',
		def: 0.5,
		format: parseFloat
	}
}

$(document).ready(function() {
	for(var i in options) {
		var x = localStorage.getItem(i) || options[i].def;
		$('#' + i).val(x);
	}
})

for (var i in options) {
	$('#' + i).on('change keydown', function(ev) {
		var id = ev.target.id;
		var o = options[id];
		var val = o.format.call(this, $('#' + id).val());
		o.settings_parent[o.settings_attr] = val;
		localStorage.setItem(id, val);
	});
}

$('#exit_settings').on('click', settings.close);

