// Do zmiany

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
	if (map.layers[0].data[i] != 0) map.avPlaces.push(i);
}

module.exports = exports = map;