'use strict';

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
	events();
	board.create();

	socket.on('game-update', function(msg) {
		id = socket.id;
		var msg = JSON.parse(msg);
		tank.list = msg.tank;
		bullets.list = msg.bullets;
		game.draw();
	});
	
});

var board = {
	WIDTH: 1000,
	HEIGHT: 500,
	elems: [{
		type: 'box',
		x1: 200,
		y1: 200,
		x2: 264,
		y2: 264,
		src: './img/box.jpg',
		obj: new Image(),
		life: 10
	}],
	create: function() {
		$('canvas').attr({
			width: board.WIDTH,
			height: board.HEIGHT
		});

		for (var i = 0; i < board.elems.length; i++) {
			var e = board.elems[i];
			e.obj.src = e.src;
			switch (e.type) {
				case 'box':
					e.obj.onload = function() {
						bg_context.drawImage(e.obj, e.x1, e.y1, e.x2 - e.x1, e.y2 - e.y1);
					}
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
		tank.draw();
		bullets.draw();
	},
	clearboard: function() {
		var context = game_context;
		context.clearRect(0, 0, board.WIDTH, board.HEIGHT);
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

			if(id == i) {
				ctx.strokeStyle = '#333';
				ctx.fillStyle = '#333';
			}
			else {
				ctx.strokeStyle = '#0a4';
				ctx.fillStyle = '#0a4';
			}

			ctx.beginPath();
			ctx.arc(ta['x'], ta['y'], 20, 0, 2 * PI, false);			
			ctx.lineWidth = 3;
			ctx.stroke();
			ctx.closePath();

			ctx.beginPath();
			ctx.arc(ta['x'], ta['y'], 10, 0, 2 * PI, false);
			ctx.fill();
			ctx.closePath();


			ctx.beginPath();
			ctx.lineWidth = 9;
			ctx.arc(ta['x'], ta['y'], 14, 0, PI * ta.life / 5, false);
			ctx.strokeStyle = '#fc0';
			ctx.stroke();
			ctx.closePath();

			(id == i)? ctx.strokeStyle = '#333' :ctx.strokeStyle = '#0a4';
			ctx.beginPath();
			ctx.moveTo(ta['lufa'].x1, ta['lufa'].y1);
			ctx.lineWidth = 6;
			ctx.lineTo(ta['lufa'].x2, ta['lufa'].y2);
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

	window.addEventListener('keydown', function(e) {
		if (focus == 1 || !(id in tank.list)) return;
		switch (e.which) {
			case 37: // LEFT
			case 65: // A
				socket.emit('client-event', {
					dirX: "-1"
				});
				break;
			case 38: // UP
			case 87: // W
				socket.emit('client-event', {
					dirY: -1
				});
				break;
			case 39: // RIGHT
			case 68: // D
				socket.emit('client-event', {
					dirX: 1
				});
				break;
			case 40: // DOWN
			case 83: // S
				socket.emit('client-event', {
					dirY: 1
				});
				break;

			case 13: // Enter - czat
				if (!focus) $('#m').trigger('focus');
				else $('#m').trigger('focusout');
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
				socket.emit('client-event', {
					dirX: 0
				});
				break;
			case 38: // UP
			case 87: // W
			case 40: // DOWN
			case 83: // S
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
		socket.emit('client-event', {
			mx: evt.clientX - rect.left
		});
		socket.emit('client-event', {
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
			context.beginPath();
			context.arc(b.x, b.y, b.r, 0, 2 * PI, false);
			context.fillStyle = '#333';
			context.fill();
			context.closePath();
		}
	}
}