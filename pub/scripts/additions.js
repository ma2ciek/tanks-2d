/* DATA */
var abilities = {
	nuke: {
		img: (function() {
			var img = new Image();
			img.src = './img/radio_active.png';
			return img;
		})(),
		audio: (function() {
			var a = new Audio('audio/explosion.mp3');
			a.load()
			return a;
		})(),
		animation: (function() {
			var img = new Image();
			img.src = './img/explosion.png';
			return img;
		})
	},
	shot: {
		img: (function() {
			var img = new Image();
			img.src = './img/ammo.png';
			return img;
		})(),
		audio: (function() {
			var a = new Audio('audio/gun_shot.wav');
			a.load();
			return a;
		})()
	},
	tar_keg: {
		img: (function() {
			var img = new Image();
			img.src = './img/tar_keg.png';
			return img;
		})(),
	}
}

var resources = {
	img: {
		tileset: (function() {
			var img = new Image();
			img.src = 'img/tileset_01.png'
			return img;
		})(),
		grass: (function() {
			var img = new Image();
			img.src = 'img/grass.png'
			return img;
		})()
	},
};



/* ADDITIONS */
var matrix = {
	id: null,
	speed: 60,
	init: function() {
		clearTimeout(this.id);
		console.log(game.mid_times.join(' '))
		this.id = setTimeout(matrix.init, 1000 / matrix.speed);
	},
	end: function() {
		clearTimeout(this.id);
	}
}

// prototyp wektora
var vector = function(x, y) {
	this.x = x;
	this.y = y;
	this.size = Math.sqrt(x * x + y * y);
	this.unit = {
		x: this.x / this.size,
		y: this.y / this.size
	};
}
// Prototryp Canvas roundRect
/*
CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	this.beginPath();
	this.moveTo(x + r, y);
	this.arcTo(x + w, y, x + w, y + h, r);
	this.arcTo(x + w, y + h, x, y + h, r);
	this.arcTo(x, y + h, x, y, r);
	this.arcTo(x, y, x + w, y, r);
	this.closePath();
	return this;
}
*/

/* REDEFINED */


if (!Date.now) {
	Date.now = function() {
		return new Date().getTime();
	}
}

window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	function(callback) {
		window.setTimeout(callback, 1000 / 60);
	};

/* PHONES */
/* 
var phone = {
	touchstart: function(evt) {},
	touchmove: function(evt) {},
	touchend: function(evt) {},
	touchcancel: function(evt) {},
}

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
	//window.addEventListener('touchstart', phone.touchstart, false);
	//window.addEventListener('touchmove', phone.touchmove, false);
	//window.addEventListener('touchend', phone.touchend, false);
	//window.addEventListener('touchcancel', phone.touchcacel, false);
	// muszę dodać klawisze
}
*/