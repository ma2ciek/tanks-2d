function randInt(a, b) {
	var r = Math.random() * (b - a) + a;
	return Math.floor(r);
}

function Vector(x, y) {
	this.x = x;
	this.y = y;
	this.size = Math.sqrt(x * x + y * y);
	this.unit = {
		x: this.x / this.size,
		y: this.y / this.size
	}
}

var circleCollision = function(x, y, r) {
	return x * x + y * y < r * r ? 1 : 0;
}

module.exports = exports = {
	randInt: randInt,
	Vector: Vector,
	circleCollision: circleCollision
};