"use strict";

var bodyParser = require('body-parser');
var routes = require('./routes');
var methodOverride = require('method-override');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Game = require('./modules/Game.js');

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
app.get('/beta', routes.beta);
app.get('/play', routes.play)
app.get('/settings', routes.settings);
app.get('/tutorial', routes.tutorial);
app.get('/real-tanks', routes.realTanks);

var port = process.env.PORT || 8080;
http.listen(port);

/* Na przyszłość coś w ten deseń:

	function RoomManager(io) {
		this._index = 0;
		this._list = {};
	}

	// Game -> Room
	function Room(id) {
		this._id = 
		this._players = {}; // <-> [];
		...
	}

	Room.prototype.play = function() {
		
	}	

*/

var game = new Game(io);
game.start();