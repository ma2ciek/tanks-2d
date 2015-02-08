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
		if(!id in tank.list) return;
		for (var i in msg) {
			switch (i) {
				case 'mx':
					tank.list[id]['mx'] = msg[i];
					break;
				case 'my':
					tank.list[id]['my'] = msg[i];
					break;
				case 'shot':
					tank.list[id].shot();
					break;
				case 'dirX':
					tank.list[id]['dirX'] = msg[i];
					break;
				case 'dirY':
					tank.list[id]['dirY'] = msg[i];
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
		bullets: bullets.list
	});
	io.emit('game-update', res);
}

var board = {
	WIDTH: 1000,
	HEIGHT: 500,
	elems: [{
		type: 'box',
		x1: 200,
		y1: 200,
		x2: 264,
		y2: 264,
		life: 10
	}],
}

var tank = {
	list: {},
	proto: function(id) {
		this.x = 100;
		this.y = 100;
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
		this.shot = function() {
			bullets.create(this.id);
		}
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

			if (dx != 0 && dy != 0) speed /= 1.4;

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

			tank.list[id].x = x;
			tank.list[id].y = y;


			var ta = tank.list[id];
			var v = new vector(ta['mx'] - ta['x'], ta['my'] - ta['y']);
			ta['lufa'] = {
				x1: ta['x'] + v.unit.x * 8,
				y1: ta['y'] + v.unit.y * 8,
				x2: ta['x'] + v.unit.x * 30,
				y2: ta['y'] + v.unit.y * 30
			};
		}
	}
};
var bullets = {
	list: [],
	move: function() {
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			b.x += b.sx * 10;
			b.y += b.sy * 10;

			// Kolizja ze ścianami
			if (b.x < 0 || b.y < 0 || b.x > board.WIDTH || b.y > board.HEIGHT) {
				bullets.list.splice(i, 1);
				i--;
				continue;
			}
			// Kolizja z boxami
			for (var j = 0; j < board.elems.length; j++) {
				var e = board.elems[j];
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