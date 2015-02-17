"use strict";

var bodyParser = require('body-parser');
var routes = require('./routes');
var methodOverride = require('method-override');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var map = require('./maps/map01.json');
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
app.get('/settings', routes.settings);

var port = process.env.PORT || 8080;


io.on('connection', function(socket) {
	socket.broadcast.emit('n-message', 'Nowa osoba dołączyła do gry');
	socket.emit('n-message', 'Dołączyłeś do gry');
	console.log(socket.id);

	socket.on('disconnect', function() {
		io.emit('n-message', 'Osoba się rozłączyła');
		if (!delete tank.list[socket.id]) {
			console.log('ERROR - nie można usunąć czołgu');
		}
	});

	socket.on('join-game', function(msg) {
		tank.create(socket.id);
		players[socket.id] = JSON.parse(msg);
		socket.emit('join', JSON.stringify({
			board: board.list,
			width: board.WIDTH,
			height: board.HEIGHT,
			map: map
		}));
	});

	socket.on('message', function(msg) {
		socket.broadcast.emit('message', msg);
	});
	socket.on('client-event', function(msg) {

		var id = socket.id;
		if (!tank.list.hasOwnProperty(id) || !id) return;
		for (var i in msg) {
			switch (i) {
				case 'mx':
					tank.list[id].mPosX = msg[i];
					break;
				case 'my':
					tank.list[id].mPosY = msg[i];
					break;
				case 'ability':
					tank.ab(id, msg[i]);
					break;
				case 'dirX':
					tank.list[id].dirX = msg[i];
					break;
				case 'dirY':
					tank.list[id].dirY = msg[i];
					break;
				case 'sw':
					players[id].SCREEN_WIDTH = msg[i];
					break;
				case 'sh':
					players[id].SCREEN_HEIGHT = msg[i];
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

var speed = 30;

var mainLoopTimer = setInterval(mainLoop, 1000 / speed);

http.listen(port, function() {
	console.log(port);
});

var cli = 0;

function mainLoop() {
	if (io.engine.clientsCount > 0) {
		tank.move();
		bullets.move();
		send_data();
		cli = 1;
	} else if (cli == 1) {
		delete require.cache['./maps/map01.json'];
		map = require('./maps/map01.json');
		cli = 0;
	}
}

function send_data() {
	var res = JSON.stringify({
		tank: tank.list,
		bullets: bullets.list,
		date: Date.now(),
		nr: ++packages.nr,
		map: map.change ? map : null
	});
	map.change = 0;
	io.emit('game-update', res);
}
var packages = {
	nr: 0
}

var players = {};

var board = {
	WIDTH: map.width * map.tilewidth,
	HEIGHT: map.height * map.tileheight,
}

var tank = {
	list: {},
	proto: function(id, pos) {
		this.x = (pos % map.width) * map.tilewidth + map.tilewidth / 2;
		this.y = (pos - pos % map.width) / map.width * map.tileheight + map.tileheight / 2;
		this.speed = Math.floor(300 / speed);
		this.dirX = 0;
		this.dirY = 0;
		this.radius = 22;
		this.r = 22;
		this.lufa = {
			x1: this.x + 5,
			y1: this.y,
			x2: this.x + 15,
			y2: this.y
		};
		this.id = id;
		this.life = 100;
		this.mx = 0;
		this.my = 0;
		this.posX = 0;
		this.posY = 0;
		this.shot = 100;
		this.nuke = 3;
	},
	ab: function(id, ability) {
		if(tank.list[id][ability] > 0) {
			var t = tank.list[id];
			switch (ability) {
				case 'shot':
					bullets.create(id);
					tank.list[id].shot--;
					break;
				case 'nuke':
					setTimeout(function() {
						map.layers[0].data[Math.floor(t.mx / map.tilewidth) + Math.floor(t.my / map.tileheight) * map.width] = 0;
						tank.list[id].nuke--;
						map.change = 1;
					});
					// Pozostało dodać obrażenie
				break;
			}
			io.emit('sound', ability);
		}
	},
	create: function(id) {
		var position;
		do {
			position = losuj(0, 450);
		} while (map.layers[0].data[position] != 0)
		tank.list[id] = new tank.proto(id, position);
	},
	move: function() {
		for (var id in tank.list) {
			var t = tank.list[id];
			var r = t.radius;
			var x = t.x;
			var y = t.y;

			var speed = t.speed;

			var dx = t.dirX;
			var dy = t.dirY;

			var old = {
				x: t.x,
				y: t.y
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

			var d = map.layers[0].data;

			// Działa tylko dla dużych boksów
			var x1 = Math.floor((x + r) / map.tilewidth);
			var y1 = Math.floor((y + r) / map.tileheight);
			var x2 = Math.floor((x - r) / map.tilewidth);
			var y2 = Math.floor((y - r) / map.tileheight);

			var otoczenie = [
				[x1, y1],
				[x1, y2],
				[x2, y1],
				[x2, y2],
			];

			var b = {};

			for (var i = 0; i < otoczenie.length; i++) {
				var tc = d[otoczenie[i][0] + otoczenie[i][1] * map.width]; // tile content
				if (tc != 0) {
					b.x = otoczenie[i][0];
					b.y = otoczenie[i][1];
					b.x1 = b.x * map.tilewidth;
					b.y1 = b.y * map.tileheight;
					b.x2 = b.x * map.tilewidth + map.tilewidth;
					b.y2 = b.y * map.tileheight + map.tileheight;

					if (b.x1 < x + r && b.x2 > x - r && b.y1 < y + r && b.y2 > y - r) {
						if (tc == 1) { // box
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
						} else if (tc == 2) { //ammo 
							d[otoczenie[i][0] + otoczenie[i][1] * map.width] = 0;
							t.shot += 10;
							map.change = 1;
						} else if (tc == 3) {
							d[otoczenie[i][0] + otoczenie[i][1] * map.width] = 0;
							t.nuke += 3;
							map.change = 1;
						} else if (tc == 4) {
							d[otoczenie[i][0] + otoczenie[i][1] * map.width] = 0;
							t.life = Math.min(100, t.life + 30);
							map.change = 1;
						}
					}
				}
			}



			/* for (var i = 0; i < board.list.length; i++) {
				var b = board.list[i];
				if (b.type != 'box') continue;

				
			}
			*/

			// Kolizje z innymi czołgami
			// DO DODANIA!!

			t.x = x;
			t.y = y;

			t.mx = t.mPosX + x - players[id].SCREEN_WIDTH / 2;
			t.my = t.mPosY + y - players[id].SCREEN_HEIGHT / 2;


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
	list: {},
	move: function() {
		for (var i in bullets.list) {
			if (bullets.list[i] === undefined) {
				delete bullets.list[i];
				continue;
			}
			var b = bullets.list[i];
			b.x += b.sx * b.speed;
			b.y += b.sy * b.speed;

			// Kolizja ze ścianami
			if (b.x < 0 || b.y < 0 || b.x > board.WIDTH || b.y > board.HEIGHT) {
				delete bullets.list[i];
				continue;
			}
			// Kolizja z boxami
			if (map.layers[0].data[Math.floor(b.x / map.tilewidth) + Math.floor(b.y / map.tileheight) * map.width] == 1) {
				delete bullets.list[i];
				continue;
			}

			for (var id in tank.list) {
				var t = tank.list[id];
				if (b.owner == t.id) continue;
				if ((t.x - b.x) * (t.x - b.x) + (t.y - b.y) * (t.y - b.y) < (t.r + b.r) * (t.r + b.r)) {
					delete bullets.list[i];
					if (!(t.life -= 10)) {
						delete tank.list[id];
					}
				}
			}
		}
	},
	proto: function(id, id2) {
		var x = tank.list[id].x;
		var y = tank.list[id].y;
		var mx = tank.list[id].mx;
		var my = tank.list[id].my;

		this.x = tank.list[id].lufa.x2;
		this.y = tank.list[id].lufa.y2;

		var size = Math.sqrt((mx - x) * (mx - x) + (my - y) * (my - y));

		this.sx = (mx - x) / size;
		this.sy = (my - y) / size;
		this.id = id2;
		this.r = 5;
		this.owner = id;
		this.speed = Math.floor(1000 / speed);
	},
	create: function(id) {
		var id2 = 'id_' + losuj(0, 10000000)
		bullets.list[id2] = new bullets.proto(id, id2);
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
	return Math.floor(r);
}