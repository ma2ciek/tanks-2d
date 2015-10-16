var map = require('./Map.js'),
	_io,

	SpecialObjectManager = require('./SpecialObjectManager.js'),
	BulletManager = require('./BulletManager.js'),
	TankManager = require('./TankManager.js'),
	PlayerManager = require('./PlayerManager.js');


var playerManager,
	tankManager,
	specialObjectManager,
	bulletManager;

function Game(io) {
	_game = this; // only for 1 "room"
	_io = io; // get the connection
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
	playerManager.on('newTank', function(id) {
		var player = playerManager.get(id);
		tankManager.create(player, id);
	});
	playerManager.on('destroyedTank', function(id) {
		tankManager.remove(id);
	});

	tankManager = new TankManager();
	specialObjectManager = new SpecialObjectManager();
	bulletManager = new BulletManager();

	tankManager.communicate({
		SOM: specialObjectManager,
		BM: bulletManager,
		PM: playerManager
	});
	
	playerManager.communicate({
		SOM: specialObjectManager,
		BM: bulletManager,
		TM: tankManager
	});

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
				// opóźnienie 0s w celu uzyskania najpierw pozycji myszki
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

module.exports = exports = Game;