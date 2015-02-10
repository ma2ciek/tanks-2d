"use strict";

var game_context;
var bg_context;
var PI = Math.PI;
var socket = io();

// STATS.JS
var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';

// CHAT
function submit() {
	if ($('#m').val() == "") return;
	socket.emit('message', $('#m').val());
	$('#messages').append('<li class="my"><span>' + $('#m').val() + '</span></li>');
	$('#m').val('');
}

// Socket Event Handlers
function socket_handlers() {
	socket.on('message', function(msg) {
		$('#messages').append('<li><span>' + msg + '</span></li>');

	});
	socket.on('n-message', function(msg) {
		$('#messages').append('<li class="neutral"><span>' + msg + '</span></li>');
	});
	socket.on('clients', function(msg) {
		$('#clients').text(msg);
	});
	socket.on('disconnect', function() {
		alert("You are disconnected");
	});
}

window.addEventListener('load', function load() {
	game_context = $('#game')[0].getContext('2d');
	bg_context = $('#bg')[0].getContext('2d');
	board.adjust();
	socket_handlers();
	$('body').append(stats.domElement);

	$('#game')[0].addEventListener('click', function(evt) {
		if (!(game.id in tank.list)) 
			game.play();
		else {
			tank.shot();
			socket.emit('client-event', {
				shot: true
			});
		}
	});
});

var canvas = {
	WIDTH: 1000,
	HEIGHT: 500
}

var board = {
	WIDTH: 2000,
	HEIGHT: 1000,
	draw_background: function() {
		var wsp = game.rel(-board.WIDTH / 2, -board.HEIGHT / 2);
		bg_context.drawImage(resources.list.bg, wsp.x + 1000, wsp.y + 500, 2000, 1000);

		game_context.beginPath();
		game_context.strokeStyle = '#000';
		game_context.rect(wsp.x + board.WIDTH / 2, wsp.y + board.HEIGHT / 2, board.WIDTH, board.HEIGHT);
		game_context.stroke();
		game_context.closePath()
	},
	list: [],
	adjust: function() {
		$('canvas').attr({
			width: canvas.WIDTH,
			height: canvas.HEIGHT
		});
	},
	draw: function() {
		for (var i = 0; i < board.list.length; i++) {
			var e = board.list[i];
			var wsp = game.rel(e.x1, e.y1);
			switch (e.type) {
				case 'box':
					game_context.drawImage(resources.list.box, wsp.x, wsp.y, e.x2 - e.x1, e.y2 - e.y1);
					break;
				default:
					break;
			}
		}
	}
}

var game = {
	id: null,
	audio: {
		shot: (function() {
			var a = new Audio('gun_shot.wav');
			a.volume = 0.5;
			return a;
		})(),
		message: (function() {
			var a = new Audio();
		})()
	},
	context: null,
	counter: 0,

	draw: function() {
		game.clearboard();
		board.draw_background();
		board.draw();
		tank.draw();
		bullets.draw();
		stats.end();
		stats.begin();
	},
	clearboard: function() {
		game_context.clearRect(0, 0, canvas.WIDTH, canvas.HEIGHT);
		bg_context.clearRect(0, 0, canvas.WIDTH, canvas.HEIGHT);
	},
	rel: function(x, y) {
		var my_tank = tank.list[game.id];
		return {
			x: x + canvas.WIDTH / 2 - my_tank.x,
			y: y + canvas.HEIGHT / 2 - my_tank.y
		}
	},
	play: function() {
		game_events();

		socket.emit('join-game');

		socket.on('tanks', function(msg) {
			game.id = socket.id;
			tank.list = JSON.parse(msg);

			socket.on('game-update', function(msg) {
				var msg = JSON.parse(msg);
				tank.list = msg.tank;
				bullets.list = msg.bullets;
				board.list = msg.boxes;
				game.draw();
			});
		});
	}
}

var tank = {
	list: {},
	shot: function() {
		game.audio.shot.cloneNode().play();
	},
	'draw': function() {
		for (var i in tank.list) {
			var ctx = game_context;
			var ta = tank.list[i];
			var wsp = game.rel(ta.x, ta.y);

			if (game.id == i) {
				ctx.strokeStyle = '#333';
				ctx.fillStyle = '#333';
			} else {
				ctx.strokeStyle = '#0a4';
				ctx.fillStyle = '#0a4';
			}

			ctx.beginPath();
			ctx.arc(wsp.x, wsp.y, 20, 0, 2 * PI, false);
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.closePath();

			ctx.beginPath();
			ctx.arc(wsp.x, wsp.y, 10, 0, 2 * PI, false);
			ctx.fill();
			ctx.closePath();


			ctx.beginPath();
			ctx.lineWidth = 9;
			ctx.arc(wsp.x, wsp.y, 14, 0, PI * ta.life / 5, false);
			ctx.strokeStyle = '#fc0';
			ctx.stroke();
			ctx.closePath();

			var wsp1 = game.rel(ta.lufa.x1, ta.lufa.y1);
			var wsp2 = game.rel(ta.lufa.x2, ta.lufa.y2);

			(game.id == i) ? ctx.strokeStyle = '#333': ctx.strokeStyle = '#0a4';
			ctx.beginPath();
			ctx.moveTo(wsp1.x, wsp1.y);
			ctx.lineWidth = 6;
			ctx.lineTo(wsp2.x, wsp2.y);
			ctx.stroke();
			ctx.closePath();
		}
	}
}

function game_events() {

	var focus = 0;
	$('#m').focusin(function() {
		focus = 1;
	}).focusout(function() {
		focus = 0;
	});

	window.addEventListener('keydown', function(evt) {
		if (focus == 1 || !(game.id in tank.list)) return;
		switch (evt.which) {
			case 37: // LEFT
			case 65: // A
				tank.list[game.id].dirX = -1;
				socket.emit('client-event', {
					dirX: -1,
				});
				break;
			case 38: // UP
			case 87: // W
				tank.list[game.id].dirY = -1;
				socket.emit('client-event', {
					dirY: -1,
				});
				break;
			case 39: // RIGHT
			case 68: // D
				tank.list[game.id].dirX = 1;
				socket.emit('client-event', {
					dirX: 1,
				});
				break;
			case 40: // DOWN
			case 83: // S
				tank.list[game.id].dirY = 1;
				socket.emit('client-event', {
					dirY: 1,
				});
				break;
			case 13: // Enter - czat
				if (!focus) $('#m').trigger('focus');
				else $('#m').trigger('focusout');
				break;
			default:
				break;
		}
	});
	window.addEventListener('keyup', function(e) {
		if (focus == 1 || !(game.id in tank.list)) return;
		switch (e.which) {
			case 37: // LEFT
			case 65: // A
			case 39: // RIGHT
			case 68: // D
				tank.list[game.id].dirX = 0;
				socket.emit('client-event', {
					dirX: 0
				});
				break;
			case 38: // UP
			case 87: // W
			case 40: // DOWN
			case 83: // S
				tank.list[game.id].dirY = 0;
				socket.emit('client-event', {
					dirY: 0
				});
				break;
			default:
		}
	});
	var can = $('#game')[0];
	can.addEventListener('mousemove', function(evt) {
		if (!(game.id in tank.list)) return;

		var rect = can.getBoundingClientRect();
		tank.list[game.id].mPosX = evt.clientX - rect.left;
		tank.list[game.id].mPosY = evt.clientY - rect.top;
		socket.emit('client-event', {
			mx: evt.clientX - rect.left,
			my: evt.clientY - rect.top
		});
	});
	can.addEventListener('click', function(evt) {
		if (!(game.id in tank.list)) 
			game.play();
		else {
			tank.shot();
			socket.emit('client-event', {
				shot: true
			});
		}
	});
}

var bullets = {
	list: [],
	draw: function() {
		var context = game_context;
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			var wsp = game.rel(b.x, b.y);
			context.strokeStyle
			context.beginPath();
			context.arc(wsp.x, wsp.y, b.r, 0, 2 * PI, false);
			context.fillStyle = '#333';
			context.fill();
			context.closePath();
		}
	}
}

var resources = {
	list: {
		bg: (function() {
			var img = new Image();
			img.src = './img/bg.jpg';
			return img;
		})(),
		box: (function() {
			var img = new Image();
			img.src = './img/box.jpg';
			return img;
		})()
	}
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