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
	this.lufa = {
		x: 300,
		y: 400
	};
	this.id = id;
	this.life = 100;
	this.max_life = 100;
	this.mx = null;
	this.my = null;
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
			amount: abilities[i].start_amount,
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

Tank.prototype.useAbility = function(abilityName) {
	var ability = abilities[abilityName];
	var id = this.id;
	if (this.ab[abilityName].amount > 0) {
		this.ab[abilityName].amount--;

		if (a.bullets)
			bullets.create(id);

		if (a.sp_object)
			sp_objects.create(id, ability, this.mx, this.my);

		setTimeout(this._timeoutAbility, ability.latency, ability)
	}
}

Tank.prototype._timeoutAbility = function(ability) {
	var dmg = a.base_dmg;
	if (ability.AoE && dmg > 0) {
		for (var i in tanks.list) {
			var t2 = tanks.list[i];
			if (!col.circle(t2.x - this.mx, t2.y - my, ability.baseRadius))
				return;

			t2.life -= dmg;
			if (t2.life > 0)
				return;

			murder(this, t2);
		}
	}
	game.animations.push({
		ab: abilityName,
		x: this.mx,
		y: this.my
	});
}

module.exports = exports = Tank;