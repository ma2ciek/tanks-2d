var col = require('./col.js'),
	losuj = require('./Math.js'),
	ab = require('./abilities.js'),
	Player = require('./Player.js'),
	Tank = require('./Tank.js'),
	map = require('./Map.js'),
	io,
	_game;

var playerManager,
	tankManager,
	mapReloadId,
	mainLoopId,
	resourceLoopId;

var SPEED = 40;

function Game(io) {
	_game = this;
	_io = io;
	this.packageNr = 0;
	this.murders = [];
	this.animations = [];
	this.sounds = [];
	this.latency = 0;
	this.serverTime = Date.now();
}

Game.prototype.start = function() {
	playerManager = new PlayerManager();
	tankManager = new TankManager();
	startConnection();

	mapReloadId = setInterval(uploadMap, 3000);
	mainLoopId = setInterval(this._mainLoop.bind(this), 1000 / SPEED);
	resourceLoopId = setInterval(creatingResources, 20000, map, losuj);
}

Game.prototype._mainLoop = function() {
	if (_io.engine.clientsCount > 0) {
		var time = Date.now();
		tanks.move();
		bullets.move();
		spObjects.animate();
		this.latency = Date.now() - time;
		this._sendData();
	}
}
Game.prototype._sendData = function() {
	var res = JSON.stringify({
		t: tankManager.export(),
		b: bullets.export(),
		mc: map.changes,
		sp: spObjects.export(),
		a: this.animations,
		sl: this.latency,
		ts: Date.now(),
		m: this.murders,
		nr: ++this.packageNr,
	});
	_io.emit('game-update', res);
	map.changes.length = 0;
	this.animations.length = 0;
	this.murders.length = 0;
}

function startConnection() {
	_io.on('connection', function(socket) {
		socket.on('disconnect', function() {
			var tank = tankManager.get(socket.id);
			if (tank)
				_io.emit('n-message', tank.getNick() + ' się rozłączył/-a');
			tankManager.removeTank(socket.id);
		});

		socket.on('game-ping', function(msg) {
			socket.emit('game-ping', JSON.stringify(msg))
		})

		socket.on('join-game', function(msg) {
			joinGame(socket, msg);
		});

		socket.on('reborn', function() {
			if (socket.id) {
				tanks.create(socket.id);
				socket.emit('join', JSON.stringify({
					map: map
				}));
			}
		})

		socket.on('message', function(msg) {
			socket.broadcast.emit('message', msg);
		});
		socket.on('client-event', function(msg) {
			getClientEvent(socket, msg);
		});
	});
}

function joinGame(socket, msg) {
	var msg = JSON.parse(msg);
	socket.broadcast.emit('n-message', msg.nick + ' dołączył/-a do gry');
	socket.emit('n-message', 'Dołączyłeś/-aś do gry');

	playerManager.addPlayer(socket.id, socket.handshake.address, msg);

	socket.emit('join', JSON.stringify({
		width: map.width * map.tilewidth,
		height: map.height * map.tileheight,
		map: map
	}));
}

function getClientEvent(socket, msg) {
	var id = socket.id;
	if (!tanks.list.hasOwnProperty(id) || !id)
		return;

	for (var i in msg) {
		switch (i) {
			case 'mx':
				tanks.list[id].mPosX = msg[i];
				break;
			case 'my':
				tanks.list[id].mPosY = msg[i];
				break;
			case 'ability':
				setTimeout(tanks.ab, 0, id, msg[i]);
				break;
			case 'dirX':
				tanks.list[id].dirX = msg[i];
				break;
			case 'dirY':
				tanks.list[id].dirY = msg[i];
				break;
			case 'sw':
				playerManager.get(id).setScreenWidth(msg[i]);
				break;
			case 'sh':
				playerManager.get(id).setScreenHeight(msg[i]);
				break;
			default:
				console.error(i, msg[i]);
				break;
		}
	}
}

function uploadMap() {
	var data = map.layers[1].data;
	_io.emit('map', data.join(''));
}

function PlayerManager() {
	this._list = {};
}

PlayerManager.prototype.get = function(id) {
	return this._list[id];
};

PlayerManager.prototype.addPlayer = function(id, ip, settings) {
	this._list[id] = new Player(id, ip, settings);
	this._checkDuplicates(id, ip);
	tankManager.create(id);
};

PlayerManager.prototype._checkDuplicates = function(id, ip) {
	for (var i in this._list) {
		if (this._list[i].getIp() == ip && i != id) {
			this._list[id].addStats(this._list[i].kills, this._list[i].deaths)
			this.removePlayer(i);
			tankManager.removeTank(i);
			break;
		}
	}
};

PlayerManager.prototype.removePlayer = function(id) {
	delete this._list[id];
};



function TankManager() {
	this._list = {};
}

TankManager.prototype.get = function(id) {
	return tanks.list[id];
};

TankManager.prototype.removeTank = function(id) {
	delete tanks.list[id];
};

TankManager.prototype.create = function(id) {
	var x = losuj(0, 4);
	var wsp = map.getPos(map.startPositions[x])
	var t = new Tank(id, wsp);
	var player = playerManager.get(id);

	t.getStatsFromPlayer(player);
	tanks.list[id] = t;
}

TankManager.prototype.export = function() {
	var list = tanks.list;
	var el = {};

	function exportResources(tankId) {
		var res = {};
		for (var j in list[tankId].ab) {
			var a = list[tankId].ab[j];
			res[ab[j].id] = {};
			for (var k in a) {
				res[ab[j].id][k[0]] = a[k] // UWAGA - UCINA!!!!
			}
		}
		return res;
	}


	for (var tankId in list) {
		el[tankId] = {
			x: Math.round(list[tankId].x),
			y: Math.round(list[tankId].y),
			k: list[tankId].kills,
			d: list[tankId].deaths,
			l: { // do zmiany
				x: Math.round(list[tankId].lufa.x * 10), // zawsze jeden znak do przodu :D
				y: Math.round(list[tankId].lufa.y * 10)
			},
			lf: list[tankId].life,
			mlf: list[tankId].maxLife,
			ab: exportResources(tankId),
			n: list[tankId].nick,
			a: list[tankId].auras,
		}
	}
	return el;

}

function murder(id1, id2) {
	var killer = playerManager.get(id1);
	var victim = playerManager.get(id2);
	_game.murders.push([killer.getNick(), victim.getNick()]);

	if (id1 != id2)
		killer.addStats(1, 0);

	victim.addStats(0, 1);

	tanks.list[id1].getStatsFromPlayer(killer);
	tankManager.removeTank(id2);
}


var tanks = {
	list: {},
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
			if (dx != 0 && dy != 0) speed /= 1.4;

			var maxOp = 0;
			for (var i in spObjects.list) {
				var ob = spObjects.list[i];

				if (ob.kind == 'darkSpot') {
					if (col.circle(ob.x - x, ob.y - y, ob.r + r)) {
						maxOp = Math.max(maxOp, ob.op);
					}
				}
			}
			speed *= ((2 - maxOp) / 2)

			speed = Math.round(speed);

			x += dx * speed;
			y += dy * speed;

			// Kolizje ze ścianami
			if (x < r) {
				x = r;
			} else if (x > map.width * map.tilewidth - r) {
				x = map.width * map.tilewidth - r;
			}
			if (y < r) {
				y = r;
			} else if (y > map.height * map.tileheight - r) {
				y = map.height * map.tileheight - r;
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
								t.ab.shot.amount += losuj(5, 20);
								d[tile] = 0;
								map.changes.push([tile, 0]);
								break;
							case 3:
								t.ab.nuke.amount += losuj(1, 5);
								d[tile] = 0;
								map.changes.push([tile, 0]);
								break;
							case 4:
								if (t.life < t.maxLife) {
									t.life = Math.min(t.maxLife, t.life + 30);
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
								t.ab.tarKeg.amount += losuj(1, 5);
								d[tile] = 0;
								map.changes.push([tile, 0]);
								break;
						}
					}
				}
			}
			// KURSOR
			t.mx = t.mPosX + x - playerManager.get(id).getScreenWidth() / 2;
			t.my = t.mPosY + y - playerManager.get(id).getScreenHeight() / 2;

			// RUCH:
			t.x = x;
			t.y = y;

			// DZIAŁO:

			// TODO: Do zmiany na Radiany - jedna zmienna
			var v = new Vector(t.mx - t.x, t.my - t.y);
			t.lufa = {
				x: t.x + v.unit.x * 30,
				y: t.y + v.unit.y * 30
			};
		}
	}
}

function Bullet(id, id2) {
	var x = tanks.list[id].x;
	var y = tanks.list[id].y;
	var mx = tanks.list[id].mx;
	var my = tanks.list[id].my;

	this.x = tanks.list[id].lufa.x;
	this.y = tanks.list[id].lufa.y;

	var size = Math.sqrt((mx - x) * (mx - x) + (my - y) * (my - y));

	this.sx = (mx - x) / size;
	this.sy = (my - y) / size;
	this.id = id2;
	this.r = 5;
	this.owner = id;
	this.speed = 25;
}

var bullets = {
	index: 0,
	list: {},
	export: function() {
		var el = {}
		for (var i in this.list) {
			el[i] = {
				x: Math.round(this.list[i].x),
				y: Math.round(this.list[i].y),
				r: this.list[i].r
			}
		}
		return el;
	},
	move: function() {
		for (var i in bullets.list) {
			var b = bullets.list[i];
			if (bullets.list[i] === undefined || !tanks.list[b.owner]) {
				delete bullets.list[i];
				continue;
			}

			b.x += b.sx * b.speed;
			b.y += b.sy * b.speed;

			// Kolizja ze ścianami
			if (b.x < 0 || b.y < 0 || b.x > map.width * map.tilewidth || b.y > map.height * map.tileheight) {
				delete bullets.list[i];
				continue;
			}
			// Kolizja z boxami
			if (map.layers[1].data[map.getId(b.x, b.y)] == 1) {
				delete bullets.list[i];
				continue;
			}

			for (var id in tanks.list) {
				var t = tanks.list[id];
				if (b.owner == t.id)
					continue;
				if (col.circle(t.x - b.x, t.y - b.y, t.r + b.r)) {
					delete bullets.list[i];
					t.life -= 10;

					if (t.life <= 0)
						murder(b.owner, id);
					break;
				}
			}

		}
	},
	create: function(id) {
		var id2 = 'id_' + (++bullets.index);
		bullets.list[id2] = new Bullet(id, id2);
	}
}

function SpecialObject(owner, ability, x, y) {
	this.kind = ability.spObject;
	this.x = x;
	this.y = y;
	this.creationTime = Date.now();
	switch (this.kind) {
		// do zmiany 
		case 'darkSpot':
			this.t1 = 500;
			this.t2 = 6000;
			this.t3 = 8000;
			this.r = 0;
			this.op = 1;
			this.maxR = tanks.list[owner].ab.tarKeg.radius;
			break;
		case 'nukeMark':
			this.t1 = 500;
			break;
		default:
			console.error('Dziwny typ obiektu', this.ind);
	}
}

var spObjects = {
	index: 0,
	list: {},
	export: function() {
		var el = {}
		for (var i in this.list) {
			if (!this.list.hasOwnProperty(i))
				continue;
			el[i] = {
				k: this.list[i].kind[0], // UWAGA na przyszłość!!!
				x: parseInt(this.list[i].x),
				y: parseInt(this.list[i].y),
				r: this.list[i].r || 0,
				o: this.list[i].op || 0
			};
		};
		return el;
	},
	animate: function() {
		for (var i in this.list) {
			if (!this.list.hasOwnProperty(i))
				continue;

			var o = this.list[i];
			var d = Date.now();

			switch (o.kind) {
				case 'darkSpot':
					if (d - o.creationTime < o.t1) { // grow up
						o.r = Math.round((d - o.creationTime) / o.t1 * o.maxR);
					} else if (d - o.creationTime < o.t2)
						o.r = o.maxR;
					else if (d - o.creationTime < o.t3) {
						o.op = parseFloat(((o.t3 - d + o.creationTime) / (o.t3 - o.t2)).toFixed(2));
					} else {
						delete this.list[i];
					}
					break;
				case 'nukeMark':
					if (d - o.creationTime > o.t1) {
						delete this.list[i];
					}
					break;
				default:
					console.error('Dziwny typ obiektu', o.kind);
			}
		}
	},
	create: function(owner, ability, x, y) {
		this.list['id_' + ++this.index] = new SpecialObject(owner, ability, x, y);
	}
}

function Vector(x, y) {
	this.x = x;
	this.y = y;
	this.size = Math.sqrt(x * x + y * y);
	this.unit = {
		x: this.x / this.size,
		y: this.y / this.size
	}
}

function creatingResources(map, losuj) {
	var chances = [0, 0, 0.4, 0.25, 0.15, 0.1, 0.1];
	var x = losuj(0, map.avPlaces.length);
	if (map.layers[1].data[map.avPlaces[x]] == 0) {

		var rand = Math.random();
		for (var i = 0; i < chances.length; i++) {
			if (rand > chances[i]) rand -= chances[i];
			else break;
		}
		map.layers[1].data[map.avPlaces[x]] = i;
	}
}

module.exports = exports = Game;