require('./Bullet.js');

function BulletManager() {
	this._list = {};
	this._index = 0;
}

BulletManager.prototype.export = function() {
	var exportObj = {}
	for (var id in this._list) {
		if (!this._list.hasOwnProperty(id))
			continue;

		var bullet = this._list[id];
		exportObj[i] = {
			x: Math.round(bullet.x),
			y: Math.round(bullet.y),
			r: bullet.r
		}
	}
	return exportObj;
};

BulletManager.prototype.remove = function(id) {
	delete this._list[id];
};

BulletManager.prototype.move = function() {
	for (var id in this._list) {
		var bullet = this._list[id];
		if (bullet === undefined || !tankManager.get(bullet.owner)) {
			this.remove(id);
			continue;
		}
		bullet.move();
	}
};

BulletManager.prototype.create = function(id) {
	var id2 = 'id_' + (++bullets._index);
	bullets._list[id2] = new Bullet(id, id2);
}

module.exports = exports = BulletManager;
