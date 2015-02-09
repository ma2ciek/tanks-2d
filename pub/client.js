"use strict";

var game_context;
var bg_context;
var PI = Math.PI;
var socket = io();
var id = 0;

// CHAT
function submit() {
	if ($('#m').val() == "") return;
	socket.emit('message', $('#m').val());
	$('#messages').append('<li class="my"><span>' + $('#m').val() + '</span></li>');
	$('#m').val('');
}
$(window).on('beforeunload', function() {
	socket.disconnect()
});

socket.on('message', function(msg) {
	$('#messages').append('<li><span>' + msg + '</span></li>');

});
socket.on('n-message', function(msg) {
	$('#messages').append('<li class="neutral"><span>' + msg + '</span></li>');
});
socket.on('clients', function(msg) {
	$('#clients').text(msg);
});

window.addEventListener('load', function load() {
	game_context = $('#game')[0].getContext('2d');
	bg_context = $('#bg')[0].getContext('2d');
	board.adjust();
	events();

	socket.on('game-update', function(msg) {
		id = socket.id;
		var msg = JSON.parse(msg);
		tank.list = msg.tank;
		bullets.list = msg.bullets;
		board.list = msg.boxes;

		game.draw();
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
		var wsp = rel(-board.WIDTH / 2, -board.HEIGHT / 2);
		bg_context.drawImage(resources.list.bg, wsp.x + 1000, wsp.y + 500, 2000, 1000);

		game_context.beginPath();
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
			var wsp = rel(e.x1, e.y1);
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
	},
	clearboard: function() {
		game_context.clearRect(0, 0, canvas.WIDTH, canvas.HEIGHT);
		bg_context.clearRect(0, 0, canvas.WIDTH, canvas.HEIGHT);
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
			var wsp = rel(ta.x, ta.y);

			if (id == i) {
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

			var wsp1 = rel(ta.lufa.x1, ta.lufa.y1);
			var wsp2 = rel(ta.lufa.x2, ta.lufa.y2);

			(id == i) ? ctx.strokeStyle = '#333': ctx.strokeStyle = '#0a4';
			ctx.beginPath();
			ctx.moveTo(wsp1.x, wsp1.y);
			ctx.lineWidth = 6;
			ctx.lineTo(wsp2.x, wsp2.y);
			ctx.stroke();
			ctx.closePath();
		}
	}
}

function events() {

	var focus = 0;
	$('#m').focusin(function() {
		focus = 1;
	}).focusout(function() {
		focus = 0;
	});

	window.addEventListener('keydown', function(evt) {
		if (focus == 1 || !(id in tank.list)) return;
		switch (evt.which) {
			case 37: // LEFT
			case 65: // A
				tank.list[id].dirX = -1;
				socket.emit('client-event', {
					dirX: -1,
				});
				break;
			case 38: // UP
			case 87: // W
				tank.list[id].dirY = -1;
				socket.emit('client-event', {
					dirY: -1,
				});
				break;
			case 39: // RIGHT
			case 68: // D
				tank.list[id].dirX = 1;
				socket.emit('client-event', {
					dirX: 1,
				});
				break;
			case 40: // DOWN
			case 83: // S
				tank.list[id].dirY = 1;
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
		if (focus == 1 || !(id in tank.list)) return;
		switch (e.which) {
			case 37: // LEFT
			case 65: // A
			case 39: // RIGHT
			case 68: // D
				tank.list[id].dirX = 0;
				socket.emit('client-event', {
					dirX: 0
				});
				break;
			case 38: // UP
			case 87: // W
			case 40: // DOWN
			case 83: // S
				tank.list[id].dirY = 0;
				socket.emit('client-event', {
					dirY: 0
				});
				break;
			default:
		}
	});
	var can = $('#game')[0];
	can.addEventListener('mousemove', function(evt) {
		if (!(id in tank.list)) return;

		var rect = can.getBoundingClientRect();
		tank.list[id].mPosX = evt.clientX - rect.left;
		tank.list[id].mPosY = evt.clientY - rect.top;
		socket.emit('client-event', {
			mx: evt.clientX - rect.left,
			my: evt.clientY - rect.top
		});
	});
	can.addEventListener('click', function(evt) {
		if (!(id in tank.list)) return;
		tank.shot();
		socket.emit('client-event', {
			shot: true
		});
	});
}

var bullets = {
	list: [],
	draw: function() {
		var context = game_context;
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			var wsp = rel(b.x, b.y);
			context.strokeStyle
			context.beginPath();
			context.arc(wsp.x, wsp.y, b.r, 0, 2 * PI, false);
			context.fillStyle = '#333';
			context.fill();
			context.closePath();
		}
	}
}

function rel(x, y) {
	var my_tank = tank.list[id];
	return {
		x: x + canvas.WIDTH / 2 - my_tank.x,
		y: y + canvas.HEIGHT / 2 - my_tank.y
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