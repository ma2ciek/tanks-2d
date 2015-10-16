var utils = require('./utils.js');
var EventEmitter = require('./EventEmitter.js');
var Tank = require('./Tank.js');
var myMath = require('./Math.js');
var map = require('./Map.js');

function TankManager() {
	EventEmitter.call(this);
	this._list = {};
}

utils.extend(TankManager, EventEmitter);

TankManager.prototype.get = function(id) {
	return this._list[id];
};

TankManager.prototype.communicate = function(o) {
	for(var name in o) {
		this[name] = o[name];
	}
}

TankManager.prototype.removeTank = function(id) {
	delete this._list[id];
};

TankManager.prototype.getAll = function() {
	return this._list;
};

TankManager.prototype.move = function() {
	for (var id in this._list) {
		this._list[id].move();
	}
};

TankManager.prototype.create = function(player, id) {
	var x = myMath.randInt(0, 4);
	var wsp = map.getPos(map.startPositions[x])
	var t = new Tank(id, wsp);

	t.getStatsFromPlayer(player);
	this._list[id] = t;
};

TankManager.prototype.export = function() {
	var exportedObj = {};

	for (var tankId in this._list) {
		var tank = this._list[tankId];
		exportedObj[tankId] = {
			x: Math.round(tank.x),
			y: Math.round(tank.y),
			k: tank.kills,
			d: tank.deaths,
			l: { // do zmiany
				x: Math.round(tank.gun.x * 10), // zawsze jeden znak do przodu :D
				y: Math.round(tank.gun.y * 10)
			},
			lf: tank.life,
			mlf: tank.maxLife,
			ab: tank.exportResources(),
			n: tank.nick,
			a: tank.auras,
		}
	}
	return exportedObj;
}

module.exports = exports = TankManager;