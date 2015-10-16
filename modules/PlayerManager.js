var utils = require('./utils.js');
var EventEmitter = require('./EventEmitter.js');
var Player = require('./Player.js');

function PlayerManager() {
	EventEmitter.call(this);
	this._list = {};
}
utils.extend(PlayerManager, EventEmitter);

PlayerManager.prototype.communicate = function(o) {
	for(var name in o) {
		this[name] = o[name];
	}
}

PlayerManager.prototype.get = function(id) {
	return this._list[id];
};

PlayerManager.prototype.addPlayer = function(id, ip, settings) {
	this._list[id] = new Player(id, ip, settings);
	this._checkDuplicates(id, ip);
	this.emit('newTank', id);
};

PlayerManager.prototype._checkDuplicates = function(id, ip) {
	for (var i in this._list) {
		if (this._list[i].getIp() == ip && i != id) {
			this._list[id].addStats(this._list[i].kills, this._list[i].deaths)
			this.removePlayer(i);
			this.emit('removeTank', i);
			break;
		}
	}
};

PlayerManager.prototype.removePlayer = function(id) {
	delete this._list[id];
};

module.exports = exports = PlayerManager;