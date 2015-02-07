"use strict";

window.addEventListener('load', function load() {
	game.context = $('canvas').getContext('2d');
	game.timer.start = +new Date();
	game.context.webkitImageSmoothingEnabled = true;
	events();
	game.draw();
});

var PI = Math.PI;

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

		var context = game.context;

		context.clearRect(0, 0, 500, 500);

		animate();

		// Player 1
		context.beginPath();
		context.arc(player.get('x'), player.get('y'), 20, 0, 2 * PI, false);
		context.strokeStyle = '#333';
		context.lineWidth = 3;
		context.stroke();
		context.closePath();

		context.beginPath();
		context.arc(player.get('x'), player.get('y'), 10, 0, 2 * PI, false);
		context.fillStyle = '#333';
		context.fill();
		context.closePath();

		var v = new vector(player.get('mx') - player.get('x'), player.get('my') - player.get('y'));
		player.set('lufa', {
			x1: player.get('x') + v.unit.x * 8,
			y1: player.get('y') + v.unit.y * 8,
			x2: player.get('x') + v.unit.x * 30,
			y2: player.get('y') + v.unit.y * 30
		})


		context.beginPath();
		context.moveTo(player.get('lufa').x1, player.get('lufa').y1);
		context.lineWidth = 6;
		context.lineTo(player.get('lufa').x2, player.get('lufa').y2);
		context.stroke();
		context.closePath();


		// Player 2
		// do dodania

		// BULLETS

		bullets.animate();

		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			context.beginPath();
			context.arc(b.x, b.y, 5, 0, 2 * PI, false);
			context.fillStyle = '#333';
			context.fill();
			context.closePath();

		}


		//game.counter++;
		//game.timer.id = window.setTimeout(game.draw, game.timer.remaining());

		window.requestAnimationFrame(game.draw)
	}
}
var player = (function() {
	// CZOŁG
	var attr = {
		"x": 100,
		"y": 100,
		"max_speed": 6,
		"dirX": 0,
		"dirY": 0,
		"radius": 22,
		"mx": 0,
		"my": 0,
		"lufa": {
			"x": 0,
			"y": 0
		}
	}
	return {
		'get': function(key) {
			return attr[key];
		},
		'set': function(key, value) {
			attr[key] = value;
			return this;
		}
	}
})();


function animate() {
	var r = player.get('radius');
	var x = player.get('x');
	var y = player.get('y');

	var speed = player.get("max_speed");

	var dx = player.get('dirX');
	var dy = player.get('dirY');

	if (dx != 0 && dy != 0) speed /= 1.4;

	x += dx * speed;
	y += dy * speed;


	// kolizje

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

	player.set('x', x).set('y', y);
}



function events() {

	window.addEventListener('keydown', function(e) {
		switch (e.which) {
			case 37: // LEFT
			case 65: // A
				player.set("dirX", -1);
				break;
			case 38: // UP
			case 87: // W
				player.set("dirY", -1);
				break;
			case 39: // RIGHT
			case 68: // D
				player.set("dirX", 1);
				break;
			case 40: // DOWN
			case 83: // S
				player.set("dirY", 1);
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
				player.set("dirX", 0);
				break;
			case 38: // UP
			case 87: // W
			case 40: // DOWN
			case 83: // S
				player.set("dirY", 0);
				break;
			default:
		}
	});
	var canvas = $('canvas');
	canvas.addEventListener('mousemove', function(evt) {
		var rect = canvas.getBoundingClientRect();
		player.set('mx', evt.clientX - rect.left);
		player.set('my', evt.clientY - rect.top);
	});
	canvas.addEventListener('click', function(evt) {
		bullets.create();
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
		var x = player.get('x');
		var y = player.get('y');
		var mx = player.get('mx');
		var my = player.get('my');

		var that = this;
		this.x = player.get('lufa').x2;
		this.y = player.get('lufa').y2;

		var size = Math.sqrt((mx - x) * (mx - x) + (my - y) * (my - y));

		this.sx = (mx - x) / size;
		this.sy = (my - y) / size;
	},
	create: function() {
		bullets.list.push(new bullets.proto());
	},
	animate: function() {
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			b.x += b.sx * 10;
			b.y += b.sy * 10;

			if(b.x < 0 || b.y < 0 || b.x > 500 || b.y > 500) {
				bullets.list.splice(i, 1);
				i--;
			}
		}
	}
}