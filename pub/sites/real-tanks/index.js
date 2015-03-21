"use strict";
var ctx;

window.addEventListener('load', function load() {
	$('canvas').attr({
		width: board.WIDTH,
		height: board.HEIGHT
	})
	ctx = $('canvas')[0].getContext('2d')
	game.timer.start = +new Date();
	ctx.ImageSmoothingEnabled = true;
	events();
	game.draw();
});

var PI = Math.PI;

var game = {
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

		ctx.clearRect(0, 0, board.WIDTH, board.HEIGHT);

		animate();
		//draw_boxes();
		draw_tank();

		// BULLETS
		bullets.animate();
		draw_bullets();

		window.requestAnimationFrame(game.draw)
	}
}

function draw_tank() {
	var t = tanks[player.tank]
	var x = player.x;
	var y = player.y;
	var r = Math.round;
	var v = new Vector(player.mx - player.x, player.my - player.y);
	var k = t.korpus;
	var l = t.lufa;

	player.lufa = {
		x: player.x + v.unit.x * tanks[player.tank].lufa.l,
		y: player.y + v.unit.y * tanks[player.tank].lufa.l,
	};

	ctx.save();
	ctx.translate(r(x), r(y))
	ctx.rotate(-player.angle)
	ctx.translate(-r(k.w / 2), -r(k.h / 2));
	ctx.drawImage(tanks[player.tank].img, r(k.sx), r(k.sy), r(k.w), r(k.h), 0, 0, r(k.w), r(k.h));
	ctx.restore();

	ctx.save();
	ctx.translate(r(x), r(y))
	ctx.rotate(-v.angle);
	ctx.translate(r(l.sx - l.ox), r(l.sy - l.oy));
	ctx.drawImage(tanks[player.tank].img, r(l.sx), r(l.sy), r(l.w), r(l.h), 0, 0, r(l.w), r(l.h));
	ctx.restore();
}

function draw_bullets() {
	for (var i = 0; i < bullets.list.length; i++) {
		var b = bullets.list[i];
		ctx.beginPath();
		ctx.arc(b.x, b.y, 5, 0, 2 * PI, false);
		ctx.fillStyle = '#333';
		ctx.fill();
		ctx.closePath();
	}
}

function draw_boxes() {
	for (i = 0; i < test_boxes.length; i++) {
		var b = test_boxes[i];

		var points = [
			[b.x, b.y],
			[b.x, b.y + b.h],
			[b.x + b.w, b.y + b.h],
			[b.x + b.w, b.y]
		]

		ctx.beginPath();
		ctx.fillStyle = 'green';
		ctx.moveTo(points[3][0], points[3][1]);

		for (var i = 0; i < 4; i++) {
			ctx.lineTo(points[i][0], points[i][1]);
		}
		ctx.closePath();
		ctx.fill();
	}
}
var Img = function(src) {
	var x = new Image();
	x.src = src;
	return x;
}

var board = {
	WIDTH: 1000,
	HEIGHT: 700
}

var tanks =
	[{
		korpus: {
			w: 95,
			h: 165,
			//ox: 50,
			//oy: 85,
			sx: 0,
			sy: 0
		},
		lufa: {
			sx: 110,
			sy: 35,
			w: 65,
			h: 170,
			ox: 145,
			oy: 88,
			l: 115
		},
		img: new Img('./sites/real-tanks/E-100_strip2.png'),
		padding: 5,
		speed: 7,
		rot_speed: 0.08,
		name: 'E-100'
	}, {
		korpus: {
			w: 130,
			h: 240,
			sx: 0,
			sy: 0,
		},
		lufa: {
			sx: 160,
			sy: 76,
			w: 78,
			h: 176,
			ox: 200,
			oy: 130,
			l: 120
		},
		img: new Img('./sites/real-tanks/KV-2_strip2.png'),
		padding: 5,
		speed: 5,
		rot_speed: 0.05,
		name: 'KV-2'
	}];

var player = {
	x: 100.12323,
	y: 100.123343,
	dirX: 0,
	dirY: 0,
	mx: 0,
	my: 0,
	lufa: {
		x: 0,
		y: 0
	},
	tank: 0,
	angle: 0
}

function animate() {
	var t = tanks[player.tank];
	var w = t.korpus.w / 2;
	var h = t.korpus.h / 2;

	var x = player.x;
	var y = player.y;

	var speed = t.speed;

	var dx = player.dirX;
	var dy = player.dirY;

	if (dx != 0 && dy != 0) speed /= 1.4;

	x += dx * speed;
	y += dy * speed;


	// kolizje


	if (dx || dy) {
		for (var i = 0; i < test_boxes.length; i++) {
			var b = test_boxes[i];
			if (trans_rect_col(x - w, y - h, w*2, h*2, player.angle, b.x, b.y, b.w, b.h, 0)) {
				x -= dx * speed;
				y -= dy * speed;
			}
		}
	}

	if (x < w) {
		x = w;
	} else if (x > board.WIDTH - w) {
		x = board.WIDTH - w;
	}
	if (y < h) {
		y = h;
	} else if (y > board.HEIGHT - h) {
		y = board.HEIGHT - h;
	}


	var x2 = player.x;
	var y2 = player.y
	player.x = x;
	player.y = y;


	while (player.angle >= 2 * Math.PI) {
		player.angle -= 2 * Math.PI
	};
	while (player.angle < 0) {
		player.angle += 2 * Math.PI;
	}
	var a = player.angle;
	// Obrót
	if (dx != 0 || dy != 0 && (player.x != x2 || player.y != y2)) {
		var dv = new Vector(dx, dy);
		var a2 = dv.angle;
		var add = t.rot_speed;
		if (Math.abs(a - a2) < add) {
			player.angle = dv.angle;
			//		console.log(0, a, a2);
		} else if (Math.abs(a - a2 + 2 * Math.PI) < add) {
			//		console.log(1, a, a2);
			player.angle = 2 * Math.PI - a2;
		} else if (Math.abs(a - a2 - Math.PI) < add) {
			//		console.log(2, a, a2);
			player.angle = a2 + Math.PI;
		} else if (Math.abs(a - a2 + Math.PI) < add) {
			//		console.log(3, a, a2);
			player.angle = a2 - Math.PI;
		} else if (Math.abs(a - a2 - 2 * Math.PI) < add) {
			//		console.log(4, a, a2);
			player.angle = a2 + 2 * Math.PI;
		} else if (Math.abs(a - dv.angle) <= 1 / 2 * Math.PI) {
			//		console.log(5, a, a2);
			player.angle += add * Math.sign(a2 - a);
		} else if (Math.abs(a - dv.angle) >= 3 / 2 * Math.PI) {
			//		console.log(6, a, a2);
			player.angle -= add * Math.sign(a2 - a);
		} else if (Math.abs(a - dv.angle) >= 1 / 2 * Math.PI && Math.abs(a - dv.angle) <= Math.PI) {
			//		console.log(7, a, a2);
			player.angle -= add * Math.sign(a2 - a - 1 / 2 * Math.PI)
		} else if (Math.abs(a - dv.angle) >= Math.PI && Math.abs(a - dv.angle) <= 3 / 2 * Math.PI) {
			//		console.log(8, a, a2);
			player.angle += add * Math.sign(a2 - a - Math.PI);
		}
	}

}



function events() {

	window.addEventListener('keydown', function(e) {
		switch (e.which) {
			case 9:
				e.preventDefault();
				player.tank = (player.tank + 1) % tanks.length;
				break;
			case 37: // LEFT
			case 65: // A
				player.dirX = -1;
				break;
			case 38: // UP
			case 87: // W
				player.dirY = -1;
				break;
			case 39: // RIGHT
			case 68: // D
				player.dirX = 1;
				break;
			case 40: // DOWN
			case 83: // S
				player.dirY = 1;
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
				player.dirX = 0;
				break;
			case 38: // UP
			case 87: // W
			case 40: // DOWN
			case 83: // S
				player.dirY = 0;
				break;
			default:
		}
	});
	var canvas = $('canvas')[0];
	canvas.addEventListener('mousemove', function(evt) {
		var rect = canvas.getBoundingClientRect();
		player.mx = evt.clientX - rect.left;
		player.my = evt.clientY - rect.top;
	});
	canvas.addEventListener('click', function(evt) {
		bullets.create();
	});
}

var bullets = {
	list: [],
	proto: function() {
		var x = player.x;
		var y = player.y;
		var mx = player.mx;
		var my = player.my;

		var that = this;

		this.x = player.lufa.x;
		this.y = player.lufa.y;

		var v = new Vector(x - mx, y - my);

		this.sx = (mx - x) / v.size
		this.sy = (my - y) / v.size
		this.speed = 20;
	},
	create: function() {
		bullets.list.push(new bullets.proto());
	},
	animate: function() {
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			b.x += b.sx * b.speed;
			b.y += b.sy * b.speed;

			if (b.x < 0 || b.y < 0 || b.x > board.WIDTH || b.y > board.HEIGHT) {
				bullets.list.splice(i, 1);
				i--;
			}
		}
	}
}



// PROTOTYPY

// prototyp wektora
var Vector = function(x, y) {
	this.x = x;
	this.y = y;
	this.size = Math.sqrt(x * x + y * y);
	this.unit = {
		x: this.x / this.size,
		y: this.y / this.size
	};
	this.angle = (function(x, y, s) {
		if (x == 0 && y == 0) return 0;
		else if (y > 0) return Math.asin(x / s);
		else return Math.PI - Math.asin(x / s);
	})(x, y, this.size);
	if (this.angle < 0) this.angle += 2 * Math.PI;
}

// Odcinek - Line Segment
var LS = function(x1, y1, x2, y2) {
	this.A = {
		x: x1,
		y: y1
	}
	this.B = {
		x: x2,
		y: y2,
	}
	this.grad = (y2 - y1) / (x2 - x1); // nachylenie
	this.trans = (y1 * x2 - x1 * y2) / (x2 - x1);
}

var test_boxes = [{
	x: 300,
	y: 350,
	w: 100,
	h: 100,
	fi: 0
}]

var arc_col = function(x, y, r) {
	return (x * x + y * y < r * r);
}


var trans_rect_col = function(x1, y1, w1, h1, fi1, x2, y2, w2, h2, fi2) {
	fi1 = -fi1; // inny układ współrzędnych
	var fi_diff = Math.round(((fi1 - fi2)) / Math.PI * 20000)

	var o1 = {
			cx: x1 + w1 / 2,
			cy: y1 + h1 / 2,
			R: Math.sqrt((w1 * w1 + h1 * h1)) / 2
		},
		o2 = {
			cx: x2 + w2 / 2,
			cy: y2 + h2 / 2,
			R: Math.sqrt((w2 * w2 + h2 * h2)) / 2
		};
	var rotate = function(xc, yc, x, y, r, fi) {
		return {
			x: (x - xc) * Math.cos(fi) - (y - yc) * Math.sin(fi) + xc,
			y: (y - yc) * Math.cos(fi) + (x - xc) * Math.sin(fi) + yc
		}
	}

	var P1 = [
		[x1, y1],
		[x1, y1 + h1],
		[x1 + w1, y1 + h1],
		[x1 + w1, y1]
	]
	var P2 = [
		[x2, y2],
		[x2, y2 + h2],
		[x2 + w2, y2 + h2],
		[x2 + w2, y2]
	]
	var P1_t = [],
		P2_t = [];
	var O1 = [],
		O2 = [];

	for (var i = 0; i < 4; i++) {
		P1_t.push(rotate(o1.cx, o1.cy, P1[i][0], P1[i][1], o1.R, fi1));
		P2_t.push(rotate(o2.cx, o2.cy, P2[i][0], P2[i][1], o2.R, fi2));
	}

	for (var i = 0; i < 4; i++) {
		var i2 = (i + 1) % 4;
		O1.push(new LS(P1_t[i].x, P1_t[i].y, P1_t[i2].x, P1_t[i2].y));
		O2.push(new LS(P2_t[i].x, P2_t[i].y, P2_t[i2].x, P2_t[i2].y));


		// rysowanie
		ctx.fillStyle = 'black';
		ctx.beginPath();
		ctx.arc(P1_t[i].x, P1_t[i].y, 5, 0, 2*Math.PI, false)
		ctx.moveTo(P2_t[i].x, P2_t[i].y)
		//ctx.arc(P2_t[i].x, P2_t[i].y, 5, 0, 2*Math.PI, false) - rogi boksu
		ctx.fill();
		ctx.closePath();
	}
/*
	if (fi_diff % 10000 == 0) {


		if (x1 + w1 > x2 && x1 < x2 + w2 && y1 + h1 > y2 && y1 < y2 + h2) {
			return 1;
		} else return 0;
	}http://localhost:5000/beta

	for (var i = 0; i < 4; i++) {
		for (var j = 0; j < 4; j++) {
			if (O1[i].grad != O2[i].grad) {
				var x = (O2[j].trans - O1[i].trans) / (O1[i].grad - O2[j].grad);			
				if (Math.min(O1[i].A.x, O1[i].B.x) < x && x < Math.max(O1[i].A.x, O1[i].B.x))
					if (Math.min(O2[j].A.x, O2[j].B.x) < x && x < Math.max(O2[j].A.x, O2[j].B.x))
						return 1;
			}
		}
	}
	*/
	return 0;
}