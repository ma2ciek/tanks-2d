function Bullet(id, id2) {
	var x = tankManager.get(id).getAttr('x');
	var y = tankManager.get(id).getAttr('y');
	var mx = tankManager.get(id).getAttr('mx');
	var my = tankManager.get(id).getAttr('my');

	this.x = tankManager.get(id).getAttr('gunX');
	this.y = tankManager.get(id).getAttr('gunY');

	var size = Math.sqrt((mx - x) * (mx - x) + (my - y) * (my - y));

	this.sx = (mx - x) / size;
	this.sy = (my - y) / size;
	this.id = id2;
	this.r = 5;
	this.owner = id;
	this.speed = 25;
}

Bullet.prototype.move = function() {

	this.x += this.sx * this.speed;
	this.y += this.sy * this.speed;

	if (this._isInCollisionWithWalls() || this._isInCollisionWithBoxes()) {
		bulletManager.remove(i);
		return;
	}

	// czy powinna być zrzucona odpowiedzialność??
	var tanks = TankManager.getAll();
	for (var id in tanks) {
		var tank = tanks[id];
		if (this.owner == id)
			continue;
		if (myMath.circleCollision(tank.x - this.x, tank.y - this.y, tank.r + this.r)) {
			bulletManager.remove(i);
			tank.getDamaged(10, this.owner);
			break;
		}
	}
}

Bullet.prototype._isInCollisionWithWalls = function() {
	return this.x < 0 || this.y < 0 || this.x > map.width * map.tilewidth || this.y > map.height * map.tileheight;
};

Bullet.prototype._isInCollisionWithBoxes = function() {
	return map.layers[1].data[map.getId(this.x, this.y)] == 1;
};

module.exports = exports = Bullet;