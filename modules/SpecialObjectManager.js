var SpecialObject = require('./SpecialObject');

function SpecialObjectManager() {
	this._list = {};
	this._index = 0;
}

SpecialObjectManager.prototype.getAll = function() {
	return this._list;
};

SpecialObjectManager.prototype.export = function() {
	var exportObj = {}
	var list = this._list;
	for (var i in list) {
		if (!list.hasOwnProperty(i))
			continue;
		else exportObj[i] = {
			k: list[i].kind[0], // UWAGA na przyszłość!!!
			x: parseInt(list[i].x),
			y: parseInt(list[i].y),
			r: list[i].r || 0,
			o: list[i].op || 0
		};
	};
	return exportObj;
};

SpecialObjectManager.prototype.animate = function() {
	var list = this._list;
	for (var i in list) {
		if (!list.hasOwnProperty(i))
			continue;

		var o = list[i];
		var d = Date.now();

		switch (o.kind) {
			case 'darkSpot':
				if (d - o.creationTime < o.t1) { // grow up
					o.r = Math.round((d - o.creationTime) / o.t1 * o.maxR);
				} else if (d - o.creationTime < o.t2)
					o.r = o.maxR;
				else if (d - o.creationTime < o.t3) {
					o.op = parseFloat(((o.t3 - d + o.creationTime) / (o.t3 - o.t2)).toFixed(2));
				} else
					this.remove(i);
				break;
			case 'nukeMark':
				if (d - o.creationTime > o.t1)
					this.remove(i);
				break;
			default:
				console.error('Dziwny typ obiektu', o.kind);
		}
	}
};

SpecialObjectManager.prototype.create = function(owner, ability, x, y) {
	this._list['id_' + ++this._index] = new SpecialObject(owner, ability, x, y);
};

module.exports = exports = SpecialObjectManager;