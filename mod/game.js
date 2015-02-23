module.exports = exports = {
	package_nr: 0,
	murders: [],
	animations: [],
	sounds: [],
	latency: 0,
	server_time: Date.now(),
	start_positions: [125, 154, 645, 674],
	last_start_p: -1,
	vector: function(x, y) {
		this.x = x;
		this.y = y;
		this.size = Math.sqrt(x * x + y * y);
		this.unit = {
			x: this.x / this.size,
			y: this.y / this.size
		}
	},
	creating_resources: function(map ,losuj) {
		var chances = [0, 0, 0.4, 0.25, 0.15, 0.1, 0.1];
		var x = losuj(0, map.av_places.length);
		if (map.layers[1].data[map.av_places[x]] == 0) {

			var rand = Math.random();
			for (var i = 0; i < chances.length; i++) {
				if (rand > chances[i]) rand -= chances[i];
				else break;
			}
			map.layers[1].data[map.av_places[x]] = i;
		}
	}
}