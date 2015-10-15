function Player(id, ip, settings) {
	this._ip = ip;
	this._id = id;
	this._kills = 0;
	this._deaths = 0;
	this._nick = settings.nick;
	this._screenWidth = settings.SCREEN_WIDTH;
	this._screenHeight = settings.SCREEN_HEIGHT;
}

Player.prototype.getIp = function() {
	return this._ip;
}

Player.prototype.setIp = function(ip) {
	this._ip = ip;
}

Player.prototype.getKills = function() {
	return this._kills;
}

Player.prototype.getDeaths = function() {
	return this._deaths;
}

Player.prototype.getNick = function() {
	return this._nick;
}

Player.prototype.getScreenWidth = function() {
	return this._screenWidth;
}

Player.prototype.getScreenHeight = function() {
	return this._screenHeight;
}

Player.prototype.addStats = function(kills, deaths) {
	this._kills += kills;
	this._deaths += deaths;
}

module.exports = exports = Player;