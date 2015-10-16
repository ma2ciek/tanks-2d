function extend(dest, src) {
	console.log(0, src);
	dest.prototype = Object.create(src.prototype, {
		constructor: {
			value: dest.constructor,
			enumerable: false,
			writable: true,
			configurable: true
		}
	});
	dest.super_ = src;
}

module.exports = exports = {
	extend: extend
}

