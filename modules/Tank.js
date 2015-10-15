var abilities = require('./abilities.js');
var map = require('./Map.js');

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

module.exports = exports = Tank;