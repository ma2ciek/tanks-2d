module.exports = exports = function(a, b) {
	var r = Math.random() * (b - a) + a;
	return Math.floor(r);
}
