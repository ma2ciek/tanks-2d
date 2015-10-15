// Do zmiany
var myMath = require('./Math.js');
var map = require('./../maps/map01.json');

map.getId = function(x, y) {
	return Math.floor(x / map.tilewidth) + Math.floor(y / map.tileheight) * map.width;
};
map.getPos = function(id) {
	var x = (id % map.width) * map.tilewidth + map.tilewidth / 2;
	var y = (id - id % map.width) / map.width * map.tileheight + map.tileheight / 2;
	return {
		x: x,
		y: y
	};
};

map.startPositions = [125, 154, 645, 674];
map.changes = [];
map.avPlaces = [];
map.boxes = [];

for (var i = 0; i < map.layers[0].data.length; i++) {
	map.boxes[i] = {
		life: 60
	}
	if (map.layers[0].data[i] != 0) 
		map.avPlaces.push(i);
}

map.creatingResources = function() {
	var chances = [0, 0, 0.4, 0.25, 0.15, 0.1, 0.1];
	var x = myMath.randInt(0, this.avPlaces.length);
	if (this.layers[1].data[this.avPlaces[x]] == 0) {
		var rand = Math.random();
		for (var i = 0; i < chances.length; i++) {
			if (rand > chances[i]) 
				rand -= chances[i];
			else break;
		}
		this.layers[1].data[this.avPlaces[x]] = i;
	}
}

map.emit = function(io) {
	var data = map.layers[1].data;
	io.emit('map', data.join(''));
}

module.exports = exports = map;