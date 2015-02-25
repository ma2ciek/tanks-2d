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
		animation: {
			src: './img/explosion.png',
			size: 13,
			speed: 30
		},
		mark: (function() {
			var img = new Image();
			img.src = './img/mark.png';
			return img;
		})(),
		opis: 'Mina wybuchająca po 0.5 sekundy',
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
		})(),
		opis: 'Zwykły strzał z lufy',
	},
	tar_keg: {
		img: (function() {
			var img = new Image();
			img.src = './img/tar_keg.png';
			return img;
		})(),
		opis: 'Beczka ze smołą spowalniająca przeciwnika',
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



/* DEBUGGING */

var logs = {
	LAG_1: 0,
	LAG_2: 0,
	LAG_3: 0,
	LAG_4: 0,
	LAG_5: 0,
	LAG_6: 0,
	brak_mapy: 0,
	dziwny_obiekt: 0,
	missing_packages: 0
};

var debug = {
	pl: function() {
		return JSON.stringify(packages[0]).length;
	},
	sl: function() {
		return packages[0].sl;
	},
	log: {
		mid_times: [],
		time: 0,
		addState: function() {
			this.mid_times.push(Date.now() - this.time);
			this.time = Date.now()
		},
		init: function() {
			this.time = Date.now()
		},
		show: function() {
			return this.mid_times.reduce(function(a, b) {
				return (a + b);
			})
		}
	},
	ping: {
		times: [1],
		time_sum: 1,
		addState: function(x) {
			this.times.unshift(x);
			if (this.times.length >= 50) this.time_sum -= this.times.pop();
			this.time_sum += x;
		},
		av: function() {
			return this.time_sum / this.times.length;
		}
	},
	ping2: {
		times: [1],
		time_sum: 1,
		addState: function(x) {
			this.times.unshift(x);
			if (this.times.length >= 50) this.time_sum -= this.times.pop();
			this.time_sum += x;
		},
		av: function() {
			return Math.round(this.time_sum / this.times.length);
		}
	},
	fps: {
		times: [60],
		time_sum: 60,
		last_time: Date.now(),
		count: function() {
			var d = Date.now() - this.last_time;
			this.last_time = Date.now();
			this.times.unshift(d);
			if (this.times.length >= 50) this.time_sum -= this.times.pop();
			this.time_sum += d;
		},
		av: function() {
			return Math.round(1000 / (this.time_sum / this.times.length));
		}

	},
	matrix: {
		id: null,
		speed: 10,
		loop: function() {
			console.log(
				'Czas animacji:', debug.log.show(),
				'Długość pakietu danych:', debug.pl(),
				'Obc. serwera:', debug.sl(),
				'FPS:', debug.fps.av(),
				'PING', debug.ping2.av()
			);
		},
		start: function() {
			this.id = setInterval(this.loop, 1000 / this.speed);
		},
		end: function() {
			clearInterval(this.id);
		}
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