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
app.get('/play', routes.play)
app.get('/settings', routes.settings);
app.get('/tutorial', routes.tutorial);

var port = process.env.PORT || 8080;
http.listen(port);


/*********************************         GAME       ***************************************/


var col = require('./mod/col.js');
var game = require('./mod/game.js');
var losuj = require('./mod/losuj.js');

var players = {};

io.on('connection', function(socket) {
	socket.broadcast.emit('n-message', 'Nowa osoba dołączyła do gry');
	socket.emit('n-message', 'Dołączyłeś do gry');

	console.log('ID: ' + socket.id);

	socket.on('disconnect', function() {
		io.emit('n-message', 'Osoba się rozłączyła');
		if (!delete tank.list[socket.id]) {
			console.log('ERROR - nie można usunąć czołgu');
		}
	});

	socket.on('game-ping', function(msg) {
		socket.emit('game-ping', JSON.stringify(msg))
	})

	socket.on('get_players', function() {
		socket.emit('get_players', JSON.stringify(players));
	})

	if (!players) players = {};
	if (!players[socket.id])
		players[socket.id] = {}
	players[socket.id].kills = 0;
	players[socket.id].deaths = 0

	if (socket.handshake.address) {
		for (var i in players) {
			if (players[i].ip == socket.client.conn.remoteAddress) {
				players[socket.id].kills += players[i].kills;
				players[socket.id].deaths += players[i].deaths;
				delete players[i];
				delete tank.list[i];
			}
		}
		players[socket.id].ip = socket.client.conn.remoteAddress;
	}

	socket.on('join-game', function(msg) {
		if (players[socket.id]) {
			players[socket.id].SCREEN_WIDTH = JSON.parse(msg).SCREEN_WIDTH;
			players[socket.id].SCREEN_HEIGHT = JSON.parse(msg).SCREEN_HEIGHT;

			tank.create(socket.id);
			socket.emit('join', JSON.stringify({
				board: board.list,
				width: board.WIDTH,
				height: board.HEIGHT,
				map: map
			}));
		} else {
			socket.disconnect();
		}
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

var map = require('./maps/map01.json');
map.get_id = function(x, y) {
	return Math.floor(x / map.tilewidth) + Math.floor(y / map.tileheight) * map.width;
};
map.get_pos = function(id) {
	var x = (id % map.width) * map.tilewidth + map.tilewidth / 2;
	var y = (id - id % map.width) / map.width * map.tileheight + map.tileheight / 2;
	return {
		x: x,
		y: y
	};
};
map.changes = [];
map.av_places = [];
for (var i = 0; i < map.layers[0].data.length; i++) {
	if (map.layers[0].data[i] != 0) map.av_places.push(i);
}

var board = {
	WIDTH: map.width * map.tilewidth,
	HEIGHT: map.height * map.tileheight
}

setInterval(function() {
	io.emit('clients', io.engine.clientsCount);
}, 1000);

setInterval(game.creating_resources, 20000, map, losuj);

var speed = 40;

var mainLoopTimer = setInterval(mainLoop, 1000 / speed);

function mainLoop() {
	if (io.engine.clientsCount > 0) {
		var time = Date.now();
		tank.move();
		bullets.move();
		sp_objects.animate();
		game.latency = Date.now() - time;
		send_data();
	}
}

function send_data() {
	var res = JSON.stringify({
		tank: tank.list,
		bullets: bullets.list,
		map_changes: map.changes,
		sp_objects: sp_objects.list,
		sounds: game.sounds,
		animations: game.animations,
		server_latency: game.latency,
		timestamp: Date.now(),
		nr: ++game.package_nr,
	});
	io.emit('game-update', res);
	map.changes.length = 0;
	game.sounds.length = 0;
	game.animations.length = 0;
}


var tank = {
	list: {},
	proto: function(id, pos) {
		var wsp = map.get_pos(pos)
		this.x = wsp.x;
		this.y = wsp.y;
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
		this.kills = players[id].kills;
		this.deaths = players[id].deaths;
		this.Vx = 0;
		this.Vy = 0;
		this.auras = {}
		this.ab = {
			tar_keg: 1,
			nuke: 3,
			shot: 100
		}
	},
	ab: function(id, ability) {
		if (tank.list[id].ab[ability] > 0) {
			var t = tank.list[id];
			t.ab[ability] --;
			switch (ability) {
				case 'shot':
					bullets.create(id);
					game.sounds.push(ability);
					break;
				case 'nuke':
					setTimeout(function(t, mx, my, id) {
						var tile = map.get_id(mx, my);
						if (map.layers[1].data[tile] == 1) {
							map.layers[1].data[tile] = 0; // usuwa box
							map.changes.push([tile, 0]);
						}
						for (var i in tank.list) {
							var t2 = tank.list[i];
							if (col.circle(t2.x - mx, t2.y - my, 64)) { // 64 - AoE radius
								t2.life -= 25;
								if (t2.life <= 0) {
									delete tank.list[i];
									if (t != t2) {
										t.kills++;
										players[id].kills++;
										players[i].deaths++;
									} else {
										players[i].deaths++;
									}
								}
							}
						}
						game.sounds.push(ability);
						game.animations.push({
							ab: ability,
							x: mx,
							y: my
						});
					}, 500, t, t.mx, t.my, id);
					break;
				case 'tar_keg':
					sp_objects.create('dark_spot', t.mx, t.my);
					break;
			}
		}
	},
	create: function(id) {
		var x;
		do {
			x = losuj(0, 4);
		} while (x == game.last_start_p)
		game.last_start_p = x;
		tank.list[id] = new tank.proto(id, game.start_positions[x]);
	},
	move: function() {
		for (var id in this.list) {
			var t = this.list[id];
			var r = t.radius;
			var x = t.x;
			var y = t.y;



			var dx = t.dirX;
			var dy = t.dirY;

			var old = {
				x: t.x,
				y: t.y
			};

			// SPEED: 

			var speed = t.speed;
			if (t.auras.sb) {
				if (Date.now() < t.auras.sb.timeout) {
					speed *= 1.5;
				} else delete t.auras.sb;
			}
			if (map.layers[0].data[map.get_id(x, y)] != 0) speed /= 1.3;
			if (dx != 0 && dy != 0) speed /= 1.4;

			var max_op = 0;
			for (var i in sp_objects.list) {
				var ob = sp_objects.list[i];

				if (ob.kind = 'dark_spot') {
					if (col.circle(ob.x - x, ob.y - y, ob.r + r)) {
						max_op = Math.max(max_op, ob.op);
					}
				}
			}
			speed *= ((2 - max_op) / 2)

			speed = Math.round(speed);

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

			var d = map.layers[1].data;

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
						var tile = otoczenie[i][0] + otoczenie[i][1] * map.width;


						switch (tc) {
							case 1:
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
								break;
							case 2:
								t.ab.shot += losuj(5, 20);
								d[tile] = 0;
								map.changes.push([tile, 0]);
								break;
							case 3:
								t.ab.nuke += losuj(1, 5);
								d[tile] = 0;
								map.changes.push([tile, 0]);
								break;
							case 4:
								if (t.life < 100) {
									t.life = Math.min(100, t.life + 30);
									d[tile] = 0;
									map.changes.push([tile, 0]);
								}
								break;
							case 5:
								t.auras.sb = {
									timeout: Date.now() + 10000,
								}
								d[tile] = 0;
								map.changes.push([tile, 0]);
								break;
							case 6:
								t.ab.tar_keg += losuj(1, 3);
								d[tile] = 0;
								map.changes.push([tile, 0]);
								break;
						}
					}
				}
			}

			t.x = x;
			t.y = y;

			t.mx = t.mPosX + x - players[id].SCREEN_WIDTH / 2;
			t.my = t.mPosY + y - players[id].SCREEN_HEIGHT / 2;


			var v = new game.vector(t.mx - t.x, t.my - t.y);
			t.lufa = {
				x1: t.x + v.unit.x * 8,
				y1: t.y + v.unit.y * 8,
				x2: t.x + v.unit.x * 30,
				y2: t.y + v.unit.y * 30
			};
		}
	}
}

var bullets = {
	index: 0,
	list: {},
	move: function() {
		for (var i in bullets.list) {
			var b = bullets.list[i];
			if (bullets.list[i] === undefined || !tank.list[b.owner]) {
				delete bullets.list[i];
				continue;
			}

			b.x += b.sx * b.speed;
			b.y += b.sy * b.speed;

			// Kolizja ze ścianami
			if (b.x < 0 || b.y < 0 || b.x > board.WIDTH || b.y > board.HEIGHT) {
				delete bullets.list[i];
				continue;
			}
			// Kolizja z boxami
			if (map.layers[1].data[map.get_id(b.x, b.y)] == 1) {
				delete bullets.list[i];
				continue;
			}

			for (var id in tank.list) {
				var t = tank.list[id];
				if (b.owner == t.id) continue;
				if (col.circle(t.x - b.x, t.y - b.y, t.r + b.r)) {
					delete bullets.list[i];
					t.life -= 10;

					if (t.life <= 0) {
						tank.list[b.owner].kills++;
						delete tank.list[id];
						players[b.owner].kills++;
						players[id].deaths++;
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
		var id2 = 'id_' + (++bullets.index);
		bullets.list[id2] = new bullets.proto(id, id2);
	},
}


var sp_objects = {
	index: 0,
	list: {},
	animate: function() {
		for (var i in this.list) {
			var o = this.list[i];
			switch (o.kind) {
				case 'dark_spot':
					var d = Date.now();
					if (d - o.creation_time < o.t1) { // grow up
						o.r = Math.round((d - o.creation_time) / o.t1 * o.max_r);
					} else if (d - o.creation_time < o.t2)
						o.r = o.max_r;
					else if (d - o.creation_time < o.t3) {
						o.op = parseFloat(((o.t3 - d + o.creation_time) / (o.t3 - o.t2)).toFixed(2));
					} else {
						-o.creation_tim
						delete this.list[i];
					}
					break;
				default:
					console.error('Dziwny typ obiektu');
			}

		}
	},
	proto: function(kind, x, y) {
		this.kind = kind;
		this.x = x;
		this.y = y;
		switch (this.kind) {
			case 'dark_spot':
				this.r = 0;
				this.op = 1;
				this.creation_time = Date.now();
				this.t1 = 500;
				this.t2 = 6000;
				this.t3 = 8000;
				this.max_r = 100;
				break;
			default:
				console.error('Dziwny typ obiektu');
		}
	},
	create: function(kind, x, y) {
		this.list['id_' + ++this.index] = new this.proto(kind, x, y);
	}
}