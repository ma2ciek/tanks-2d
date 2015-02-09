"use strict";

var bodyParser = require('body-parser');
var routes = require('./routes');
var methodOverride = require('method-override');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.set('view options', {
	layout: false
});

app.use(bodyParser.urlencoded({
	extended: true
}))
app.use(bodyParser.json());
app.use(methodOverride())
app.use(express.static(__dirname + '/pub'));

app.get('/', routes.index);

var port = process.env.PORT || 8080;


io.on('connection', function(socket) {
	socket.broadcast.emit('n-message', 'Nowa osoba dołączyła do rozmowy');
	socket.emit('n-message', 'Dołączyłeś do rozmowy')
	console.log(socket.id);
	tank.create(socket.id);


	socket.on('disconnect', function() {
		io.emit('n-message', 'Osoba się rozłączyła');
		if (!delete tank.list[socket.id]) {
			console.log('ERROR - nie można usunąć czołgu');
		}
	});
	socket.on('message', function(msg) {
		socket.broadcast.emit('message', msg);
	});
	socket.on('client-event', function(msg) {

		var id = socket.id;
		if (!id in tank.list) return;
		for (var i in msg) {
			switch (i) {
				case 'mx':
					tank.list[id].mPosX = msg[i];
					break;
				case 'my':
					tank.list[id].mPosY = msg[i];
					break;
				case 'shot':
					tank.shot(id);
					break;
				case 'dirX':
					tank.list[id].dirX = msg[i];
					break;
				case 'dirY':
					tank.list[id].dirY = msg[i];
					break;
				default:
					console.log(i, msg[i]);
					break;
			}
		}
	})
});
setInterval(function() {
	var clients = io.engine.clientsCount
	if (clients == 1) clients += ' person connected';
	else clients += ' persons connected'
	io.emit('clients', clients);
}, 1000);

setInterval(gameLoop, 20);

http.listen(port, function() {
	console.log(port);
});


function gameLoop() {
	tank.move();
	bullets.move();
	send_data();
}

function send_data() {
	var res = JSON.stringify({
		tank: tank.list,
		bullets: bullets.list,
		boxes: board.list
	});
	io.emit('game-update', res);
}

var canvas = {
	WIDTH: 1000,
	HEIGHT: 500
}

var board = {
	WIDTH: 2000,
	HEIGHT: 1000,
	list: [{
		type: 'box',
		x1: 200,
		y1: 200,
		x2: 264,
		y2: 264
	}, {
		type: 'box',
		x1: 320,
		y1: 320,
		x2: 384,
		y2: 384,
	}, {
		type: 'box',
		x1: 320,
		y1: 120,
		x2: 384,
		y2: 184,
	}],
}

var tank = {
	list: {},
	proto: function(id) {
		this.x = losuj(50, 1950);
		this.y = losuj(50, 950);
		this.speed = 6;
		this.dirX = 0;
		this.dirY = 0;
		this.radius = 22;
		this.r = 22;
		this.lufa = {
			x1: 0,
			y1: 0,
			x2: 0,
			y2: 0
		};
		this.id = id;
		this.life = 10;
		this.mx = 0,
			this.my = 0,
			this.posX = 0,
			this.posY = 0
	},
	shot: function(id) {
		bullets.create(id);
	},
	create: function(id) {
		tank.list[id] = new tank.proto(id);
	},
	move: function() {
		for (var id in tank.list) {

			var r = tank.list[id]['radius'];
			var x = tank.list[id]['x'];
			var y = tank.list[id]['y'];

			var speed = tank.list[id]['speed'];

			var dx = tank.list[id]['dirX'];
			var dy = tank.list[id]['dirY'];

			var old = {
				x: tank.list[id].x,
				y: tank.list[id].y
			};

			if (dx != 0 && dy != 0) speed = Math.round(speed / 1.4);

			x += dx * speed;
			y += dy * speed;

			// Kolizje ze ścianami
			if (x < r) {
				x = r;
			} else if (x > board.WIDTH - r) {
				x = board.WIDTH - r;
			}
			if (y < r) {
				y = r;
			} else if (y > board.HEIGHT - r) {
				y = board.HEIGHT - r;
			}

			// Kolizje z boksami

			for (var i = 0; i < board.list.length; i++) {
				var b = board.list[i];
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

			var t = tank.list[id];

			t.x = x;
			t.y = y;

			t.mx = t.mPosX + x - canvas.WIDTH / 2;
			t.my = t.mPosY + y - canvas.HEIGHT / 2;


			var v = new vector(t.mx - t.x, t.my - t.y);
			t.lufa = {
				x1: t.x + v.unit.x * 8,
				y1: t.y + v.unit.y * 8,
				x2: t.x + v.unit.x * 30,
				y2: t.y + v.unit.y * 30
			};
		}
	}
};
var bullets = {
	list: [],
	move: function() {
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			b.x += b.sx * b.speed;
			b.y += b.sy * b.speed;

			// Kolizja ze ścianami
			if (b.x < 0 || b.y < 0 || b.x > board.WIDTH || b.y > board.HEIGHT) {
				bullets.list.splice(i, 1);
				i--;
				continue;
			}
			// Kolizja z boxami
			for (var j = 0; j < board.list.length; j++) {
				var e = board.list[j];
				if (b.x + b.r > e.x1 && b.x - b.r < e.x2 && b.y + b.r > e.y1 && b.y - b.r < e.y2) {
					bullets.list.splice(i, 1);
					i--;
					break;

				}
			}
			for (var id in tank.list) {
				var t = tank.list[id];
				if (b.owner == t.id) continue;
				if ((t.x - b.x) * (t.x - b.x) + (t.y - b.y) * (t.y - b.y) < (t.r + b.r) * (t.r + b.r)) {
					bullets.list.splice(i, 1);
					if (!--t.life) {
						delete tank.list[id];
					}
				}
			}



		}
	},
	proto: function(id) {
		var x = tank.list[id].x;
		var y = tank.list[id].y;
		var mx = tank.list[id].mx;
		var my = tank.list[id].my;

		this.x = tank.list[id].lufa.x2;
		this.y = tank.list[id].lufa.y2;

		var size = Math.sqrt((mx - x) * (mx - x) + (my - y) * (my - y));

		this.sx = (mx - x) / size;
		this.sy = (my - y) / size;

		this.r = 5;
		this.owner = id;
		this.speed = 10;
	},
	create: function(id) {
		bullets.list.push(new bullets.proto(id));
	},
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

function losuj(a, b) {
	var r = Math.random() * (a - b);
	r += a + b;
	return Math.round(r);
}