module.exports = exports = {
	package_nr: 0,
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
	}
}