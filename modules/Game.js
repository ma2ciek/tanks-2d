const util = require('util');
const EventEmitter = require('events');

var	myMath = require('./Math.js'),
	ab = require('./abilities.js'),
	Player = require('./Player.js'),
	Tank = require('./Tank.js'),
	map = require('./Map.js'),
	SpecialObjectManager = require('./SpecialObjectManager.js'),
	_io,
	_game;

var playerManager,
	tankManager,
	specialObjectManager,
	bulletManager;

function Game(io) {
	_game = this; // only for 1 "room"
	_io = io;
	this.packageNr = 0;
	this.murders = [];
	this.animations = [];
	this.sounds = [];
	this.latency = 0;
	this.serverTime = Date.now();
	this.mapReloadId = null;
	this.mainLoopId = null
	this.resourceLoopId = null;
}

Game.prototype.start = function() {
	playerManager = new PlayerManager();
	tankManager = new TankManager();
	specialObjectManager = new SpecialObjectManager();
	bulletManager = new BulletManager();

	startConnection();

	this.mapReloadId = setInterval(map.emit.bind(map, _io), 3000);
	this.mainLoopId = setInterval(this._mainLoop.bind(this), 25);
	this.resourceLoopId = setInterval(map.creatingResources.bind(map), 20000);
}

Game.prototype._mainLoop = function() {
	if (_io.engine.clientsCount > 0) {
		var time = Date.now();
		tankManager.move();
		bulletManager.move();
		specialObjectManager.animate();
		this.latency = Date.now() - time;
		this._sendData();
	}
}
Game.prototype._sendData = function() {
	var data = JSON.stringify({
		t: tankManager.export(),
		b: bulletManager.export(),
		mc: map.changes,
		sp: specialObjectManager.export(),
		a: this.animations,
		sl: this.latency,
		ts: Date.now(),
		m: this.murders,
		nr: ++this.packageNr,
	});
	_io.emit('game-update', data);
	map.changes.length = 0;
	this.animations.length = 0;
	this.murders.length = 0;
};

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
				tankManager.create(socket.id);
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
	if (!tankManager.get(id) || !id)
		return;

	for (var i in msg) {
		switch (i) {
			case 'mx':
				tankManager.get(id).mPosX = msg[i];
				break;
			case 'my':
				tankManager.get(id).mPosY = msg[i];
				break;
			case 'ability':
				setTimeout(tankManager.get(id).useAbility(msg[i]));
				break;
			case 'dirX':
				tankManager.get(id).dirX = msg[i];
				break;
			case 'dirY':
				tankManager.get(id).dirY = msg[i];
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
	return this._list[id];
};

TankManager.prototype.removeTank = function(id) {
	delete this._list[id];
};

TankManager.prototype.getAll = function() {
	return this._list;
}

TankManager.prototype.move = function() {
	for (var id in this._list) {
		this._list[id].move();
	}
};

TankManager.prototype.create = function(id) {
	var x = myMath.randInt(0, 4);
	var wsp = map.getPos(map.startPositions[x])
	var t = new Tank(id, wsp);
	var player = playerManager.get(id);

	t.getStatsFromPlayer(player);
	this._list[id] = t;
};

TankManager.prototype.export = function() {
	var exportedObj = {};

	for (var tankId in this._list) {
		var tank = this._list[tankId];
		exportedObj[tankId] = {
			x: Math.round(tank.x),
			y: Math.round(tank.y),
			k: tank.kills,
			d: tank.deaths,
			l: { // do zmiany
				x: Math.round(tank.gun.x * 10), // zawsze jeden znak do przodu :D
				y: Math.round(tank.gun.y * 10)
			},
			lf: tank.life,
			mlf: tank.maxLife,
			ab: tank.exportResources(),
			n: tank.nick,
			a: tank.auras,
		}
	}
	return exportedObj;

}

function murder(id1, id2) {
	var killer = playerManager.get(id1);
	var victim = playerManager.get(id2);
	_game.murders.push([killer.getNick(), victim.getNick()]);

	if (id1 != id2)
		killer.addStats(1, 0);

	victim.addStats(0, 1);

	tankManager.get(id1).getStatsFromPlayer(killer);
	tankManager.removeTank(id2);
}

Tank.prototype.exportResources = function() {
	var res = {};
	for (var abilityName in this.ab) {
		var ability = this.ab[abilityName];
		res[ab[abilityName].id] = {};
		for (var k in ability) {
			res[ab[abilityName].id][k[0]] = ability[k] // UWAGA - UCINA!!!!
		}
	}
	return res;
}

Tank.prototype.move = function() {

	// Całość do podziału i zmiany...

	var r = this.radius;
	var x = this.x;
	var y = this.y;

	var dx = this.dirX;
	var dy = this.dirY;

	var old = {
		x: this.x,
		y: this.y
	};

	// SPEED: 

	var speed = this.speed;
	if (this.auras.sb) {
		if (Date.now() < this.auras.sb.timeout) {
			speed *= 1.5;
		} else delete this.auras.sb;
	}
	if (dx != 0 && dy != 0) speed /= 1.4;

	var maxOp = 0;

	var so = specialObjectManager.getAll();
	for (var i in so) {
		var ob = so[i];

		if (ob.kind == 'darkSpot') {
			if (myMath.circleCollision(ob.x - x, ob.y - y, ob.r + r)) {
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
						this.ab.shot.amount += myMath.randInt(5, 20);
						d[tile] = 0;
						map.changes.push([tile, 0]);
						break;
					case 3:
						this.ab.nuke.amount += myMath.randInt(1, 5);
						d[tile] = 0;
						map.changes.push([tile, 0]);
						break;
					case 4:
						if (this.life < this.maxLife) {
							this.life = Math.min(this.maxLife, t.life + 30);
							d[tile] = 0;
							map.changes.push([tile, 0]);
						}
						break;
					case 5:
						this.auras.sb = {
							timeout: Date.now() + 10000,
						}
						d[tile] = 0;
						map.changes.push([tile, 0]);
						break;
					case 6:
						this.ab.tarKeg.amount += myMath.randInt(1, 5);
						d[tile] = 0;
						map.changes.push([tile, 0]);
						break;
				}
			}
		}
	}
	// KURSOR
	this.mx = this.mPosX + x - playerManager.get(this.id).getScreenWidth() / 2;
	this.my = this.mPosY + y - playerManager.get(this.id).getScreenHeight() / 2;

	// RUCH:
	this.x = x;
	this.y = y;

	// DZIAŁO:

	// TODO: Do zmiany na Radiany - jedna zmienna
	var v = new myMath.Vector(this.mx - this.x, this.my - this.y);
	this.gun = {
		x: this.x + v.unit.x * 30,
		y: this.y + v.unit.y * 30
	};
}

function Bullet(id, id2) {
	var x = tankManager.get(id).getAttr('x');
	var y = tankManager.get(id).getAttr('y');
	var mx = tankManager.get(id).getAttr('mx');
	var my = tankManager.get(id).getAttr('my');

	this.x = tankManager.get(id).getAttr('gunX');
	this.y = tankManager.get(id).getAttr('gunY');

	var size = Math.sqrt((mx - x) * (mx - x) + (my - y) * (my - y));

	this.sx = (mx - x) / size;
	this.sy = (my - y) / size;
	this.id = id2;
	this.r = 5;
	this.owner = id;
	this.speed = 25;
}

Bullet.prototype.move = function() {

	this.x += this.sx * this.speed;
	this.y += this.sy * this.speed;

	if (this._isInCollisionWithWalls() || this._isInCollisionWithBoxes()) {
		bulletManager.remove(i);
		return;
	}

	// czy powinna być zrzucona odpowiedzialność??
	var tanks = TankManager.getAll();
	for (var id in tanks) {
		var tank = tanks[id];
		if (this.owner == id)
			continue;
		if (myMath.circleCollision(tank.x - this.x, tank.y - this.y, tank.r + this.r)) {
			bulletManager.remove(i);
			tank.getDamaged(10, this.owner);
			break;
		}
	}
}

Bullet.prototype._isInCollisionWithWalls = function() {
	return this.x < 0 || this.y < 0 || this.x > map.width * map.tilewidth || this.y > map.height * map.tileheight;
};

Bullet.prototype._isInCollisionWithBoxes = function() {
	return map.layers[1].data[map.getId(this.x, this.y)] == 1;
};

function BulletManager() {
	this._list = {};
	this._index = 0;
}

BulletManager.prototype.export = function() {
	var exportObj = {}
	for (var id in this._list) {
		if (!this._list.hasOwnProperty(id))
			continue;

		var bullet = this._list[id];
		exportObj[i] = {
			x: Math.round(bullet.x),
			y: Math.round(bullet.y),
			r: bullet.r
		}
	}
	return exportObj;
};

BulletManager.prototype.remove = function(id) {
	delete this._list[id];
};

BulletManager.prototype.move = function() {
	for (var id in this._list) {
		var bullet = this._list[id];
		if (bullet === undefined || !tankManager.get(bullet.owner)) {
			this.remove(id);
			continue;
		}
		bullet.move();
	}
};

BulletManager.prototype.create = function(id) {
	var id2 = 'id_' + (++bullets._index);
	bullets._list[id2] = new Bullet(id, id2);
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
			this.maxR = abilities.tarKeg.radius;
			break;
		case 'nukeMark':
			this.t1 = 500;
			break;
		default:
			console.error('Dziwny typ obiektu', this.ind);
	}
}

module.exports = exports = Game;