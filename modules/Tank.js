var abilities = require('./abilities.js');
var map = require('./Map.js');
var myMath = require('./Math.js');

function Tank(id, wsp) {
	this.x = wsp.x;
	this.y = wsp.y;
	this.speed = 10;
	this.dirX = 0;
	this.dirY = 0;
	this.radius = 22;
	this.r = 22;
	this.gun = {
		x: 300,
		y: 400
	};
	this.id = id;
	this.life = 100;
	this.maxLife = 100;
	this.mx = null; // MOUSE X
	this.my = null; // MOUSE Y
	this.mPosX = this.x;
	this.mPosY = this.y + 1;
	this.Vx = 0;
	this.Vy = 0;
	this.auras = {};

	this._addAbilities();
}

Tank.prototype._addAbilities = function() {
	this.ab = {};
	for (var i in abilities) {
		this.ab[i] = {
			amount: abilities[i].startAmount,
		}
	}
}

Tank.prototype.getStatsFromPlayer = function(player) {
	this.kills = player.getKills();
	this.deaths = player.getDeaths();
	this.nick = player.getNick();
}

Tank.prototype.getNick = function() {
	return this.nick;
}

Tank.prototype.getDamaged = function(dmg, maker) {
	this.life -= dmg;
	if (t.life <= 0)
		murder(maker, id);
}

Tank.prototype.useAbility = function(abilityName) {
	var ability = abilities[abilityName];
	var id = this.id;
	if (this.ab[abilityName].amount > 0) {
		this.ab[abilityName].amount--;

		if (ability.bullets) {}
		// this._emit('bullet', id);

		if (ability.spObject) {}
		// this._emit('spObject', id, ability, this.mx, this.my);

		setTimeout(this._timeoutAbility.bind(this), ability.latency, ability)
	}
}

Tank.prototype._timeoutAbility = function(ability) {

	var dmg = ability.baseDmg;
	if (ability.AoE && dmg > 0) {
		var tanks = tankManager.getAll();
		for (var i in tanks) {
			var t2 = tanks[i];
			if (!col.circle(t2.x - this.mx, t2.y - my, ability.baseRadius))
				return;
			t2.getDamaged(dmg, this);
		}
	}
	game.animations.push({
		ab: abilityName,
		x: this.mx, // MOUSE X
		y: this.my // MOUSE Y
	});
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
	if (dx != 0 && dy != 0) 
		speed /= 1.4;

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

module.exports = exports = Tank;