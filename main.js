"use strict";

var game_context;
var bg_context;
var PI = Math.PI;

window.addEventListener('load', function load() {
	game_context = $('#game').getContext('2d');
	bg_context = $('#bg').getContext('2d');
	game.timer.start = +new Date();
	events();
	board.create();
	game.draw();
});

var board = {
	proto: function(x, y, type, src) {
		// do dodania
	},
	elems: [{
		"type": "box",
		"x1": 200,
		"y1": 200,
		"x2": 264,
		"y2": 264,
		"src": "./img/box.jpg",
		"obj": new Image()
	}],
	create: function() {
		for (var i = 0; i < board.elems.length; i++) {
			var e = board.elems[i];
			e.obj.src = e.src;
			switch (e.type) {
				case 'box':
					e.obj.onload = function() {
						bg_context.drawImage(e.obj, e.x1, e.y1, e.x2 - e.x1, e.y2 - e.y1);
					}
					break;
				default:
					break;
			}
		}
	}
}

var data = {
	audio: {
		shot: new Audio('gun_shot.wav')
	}
}

var game = {
	context: null,
	counter: 0,
	timer: {
		T_BREAK: 30,
		start: null,
		id: null,
		t_buff: 0,
		remaining: function() {
			var diff = +new Date() - this.start;
			var delay = diff % this.T_BREAK;
			var remaining = this.T_BREAK - delay;
			return remaining;
		}
	},

	draw: function() {

		game.clearboard();

		tank.move();
		tank.draw();

		bullets.move();
		bullets.draw();

		window.requestAnimationFrame(game.draw)
	},
	clearboard: function() {
		var context = game_context;
		context.clearRect(0, 0, 500, 500);
	}
}
var player = {
	attr: {
		"mx": 0,
		"my": 0,
	}
};

var tank = {
	attr: {
		x: 100,
		y: 100,
		speed: 6,
		dirX: 0,
		dirY: 0,
		radius: 22,
		lufa: {
			x1: 0,
			y1: 0,
			x2: 0,
			y2: 0
		}
	},
	move: function() {
		var r = this.attr['radius'];
		var x = this.attr['x'];
		var y = this.attr['y'];

		var speed = this.attr['speed'];

		var dx = this.attr['dirX'];
		var dy = this.attr['dirY'];

		if (dx != 0 && dy != 0) speed /= 1.4;



		x += dx * speed;
		y += dy * speed;

		// Kolizje ze ścianami
		if (x < r) {
			x = r;
		} else if (x > 500 - r) {
			x = 500 - r;
		}
		if (y < r) {
			y = r;
		} else if (y > 500 - r) {
			y = 500 - r;
		}

		// Kolizje z boksami

		for (var i = 0; i < board.elems.length; i++) {
			var b = board.elems[i];
			if (b.type != 'box') continue;

			if (b.x1 < x + r && b.x2 > x - r && b.y1 < y + r && b.y2 > y - r) {

				if (dx == -1) {
					if (Math.abs(b.x2 - (x - r)) <= Math.abs(dx * speed)) { // kolizja z prawym bokiem boxu
						x = b.x2 + r;
					}
				} else if (dx == 1) {
					if (Math.abs(b.x1 - (x + r)) <= Math.abs(dx * speed)) { // kolizja z lewym bokiem boxu
						x = b.x1 - r;
					}
				}

				if (dy == -1) {
					if (Math.abs(b.y2 - (y - r)) <= Math.abs(dy * speed)) { // kolizja z prawym bokiem boxu
						y = b.y2 + r;
					}
				} else if (dy == 1) {
					if (Math.abs(b.y1 - (y + r)) <= Math.abs(dy * speed)) { // kolizja z lewym bokiem boxu
						y = b.y1 - r;
					}
				}

			}
		}

		this.attr['x'] = x;
		this.attr['y'] = y;
	},
	shot: function() {
		bullets.create();
		data.audio.shot.cloneNode().play();
	},
	'draw': function() {
		var ctx = game_context
		var pa = player.attr;
		var ta = tank.attr;

		ctx.beginPath();
		ctx.arc(ta['x'], ta['y'], 20, 0, 2 * PI, false);
		ctx.strokeStyle = '#333';
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.closePath();

		ctx.beginPath();
		ctx.arc(ta['x'], ta['y'], 10, 0, 2 * PI, false);
		ctx.fillStyle = '#333';
		ctx.fill();
		ctx.closePath();

		var v = new vector(pa['mx'] - ta['x'], pa['my'] - ta['y']);
		ta['lufa'] = {
			x1: ta['x'] + v.unit.x * 8,
			y1: ta['y'] + v.unit.y * 8,
			x2: ta['x'] + v.unit.x * 30,
			y2: ta['y'] + v.unit.y * 30
		};

		ctx.beginPath();
		ctx.moveTo(ta['lufa'].x1, ta['lufa'].y1);
		ctx.lineWidth = 6;
		ctx.lineTo(ta['lufa'].x2, ta['lufa'].y2);
		ctx.stroke();
		ctx.closePath();
	}
}

function events() {

	window.addEventListener('keydown', function(e) {
		switch (e.which) {
			case 37: // LEFT
			case 65: // A
				tank.attr["dirX"] = -1;
				break;
			case 38: // UP
			case 87: // W
				tank.attr["dirY"] = -1;
				break;
			case 39: // RIGHT
			case 68: // D
				tank.attr["dirX"] = 1;
				break;
			case 40: // DOWN
			case 83: // S
				tank.attr["dirY"] = 1;
				break;
			default:
				break;
		}
	});
	window.addEventListener('keyup', function(e) {
		switch (e.which) {
			case 37: // LEFT
			case 65: // A
			case 39: // RIGHT
			case 68: // D
				tank.attr["dirX"] = 0;
				break;
			case 38: // UP
			case 87: // W
			case 40: // DOWN
			case 83: // S
				tank.attr["dirY"] = 0;
				break;
			default:
		}
	});
	var can = $('#game');
	can.addEventListener('mousemove', function(evt) {
		var rect = can.getBoundingClientRect();
		player.attr['mx'] = evt.clientX - rect.left;
		player.attr['my'] = evt.clientY - rect.top;
	});
	can.addEventListener('click', function(evt) {
		tank.shot();
	});
}

// prototyp wektora
var vector = function(x, y) {
	var that = this;
	this.x = x;
	this.y = y;
	this.size = Math.sqrt(x * x + y * y);
	this.unit = {
		x: that.x / that.size,
		y: that.y / that.size
	};
}

var bullets = {
	list: [],
	proto: function() {
		var pa = player.attr;
		var ta = tank.attr;
		var x = tank.attr['x'];
		var y = tank.attr['y'];
		var mx = player.attr['mx'];
		var my = player.attr['my'];

		var that = this;
		this.x = tank.attr['lufa'].x2;
		this.y = tank.attr['lufa'].y2;

		var size = Math.sqrt((mx - x) * (mx - x) + (my - y) * (my - y));

		this.sx = (mx - x) / size;
		this.sy = (my - y) / size;
	},
	create: function() {
		bullets.list.push(new bullets.proto());
	},
	move: function() {
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			b.x += b.sx * 10;
			b.y += b.sy * 10;

			if (b.x < 0 || b.y < 0 || b.x > 500 || b.y > 500) {
				bullets.list.splice(i, 1);
				i--;
			}
		}
	},
	draw: function() {
		var context = game_context;
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			context.beginPath();
			context.arc(b.x, b.y, 5, 0, 2 * PI, false);
			context.fillStyle = '#333';
			context.fill();
			context.closePath();
		}
	}
}