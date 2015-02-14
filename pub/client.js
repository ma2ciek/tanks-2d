"use strict";

var canvas, context;
var PI = Math.PI;
var socket = io();

// Socket Event Handlers
function socket_handlers() {
	socket.on('message', chat.message)
	socket.on('n-message', chat.neutral_message);
	socket.on('clients', chat.clients);
	socket.on('disconnect', game.disconnect);
	socket.on('game-update', game.update);
}

window.addEventListener('load', function load() {
	canvas = $('#game')[0];
	context = canvas.getContext('2d');
	board.adjust();
	socket_handlers();
	game_events();

	canvas.addEventListener('click', function(evt) {
		if (!(game.id in tank.list) || game.id === null)
			game.play();
		else {
			tank.shot();
			socket.emit('client-event', {
				shot: true
			});
		}
	});
});

var game = {
	nr: 0,
	max_ping: 50, // [ms]
	const_ping: 0,
	id: null,
	last_time: +new Date(),
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
	play: function() {
		var msg = JSON.stringify(player);
		socket.emit('join-game', msg);
		game.draw();
	},
	update: function(msg) {
		var msg = JSON.parse(msg);

		game.ping = new Date() - msg.date + game.const_ping;
		if(game.ping < 0) game.const_ping = -(new Date() - msg.date); // Czemu taki Error występuje???
		var reqTime = game.max_ping - game.ping;
		if (game.id in msg.tank && msg.nr > game.nr) {
			game.nr = msg.nr;
			setTimeout(function() {
				tank.list = msg.tank;
				bullets.list = msg.bullets;
				board.list = msg.board;
			}, Math.max(0, reqTime)); // IT WORKS!!!
		} else {
			delete tank.list[game.id]
			board.clear();
			board.draw_play_button();
		}
	},
	draw: function() {
		if (game.id in tank.list) {
			board.draw_background();
			tank.draw();
			board.draw();
			bullets.draw();
			game.fps_count()
		}
		requestAnimationFrame(game.draw);
	},
	rel: function(x, y) {
		var my_tank = tank.list[game.id];
		return {
			x: x + player.SCREEN_WIDTH / 2 - my_tank.x,
			y: y + player.SCREEN_HEIGHT / 2 - my_tank.y
		}
	},
	times: [],
	time_sum: 0,
	fps_count: function() {
		var d = +new Date() - game.last_time;
		game.last_time = +new Date();

		if (game.times.length >= 50) game.time_sum -= game.times.pop();
		game.times.unshift(d);
		game.time_sum += d;
		var t = game.time_sum / game.times.length;
		
		context.font = "13px Arial";
		context.fillStyle = 'white'
		context.fillText('FPS: ' + Math.floor(1000 / t), 15, 15);
		context.fillText('PING: ' + Math.floor(game.ping), 80, 15);
	},
	disconnect: function() {
		alert("You are disconnected from the server");
	}
}

var player = {
	SCREEN_WIDTH: 1000,
	SCREEN_HEIGHT: 500
}

var board = {
	WIDTH: 2000,
	HEIGHT: 1000,
	draw_background: function() {
		context.clearRect(0, 0, player.SCREEN_WIDTH, player.SCREEN_HEIGHT);

		var wsp = game.rel(0, 0);

		var x1 = Math.max(wsp.x, 0),
			x2 = Math.min(wsp.x + board.WIDTH, player.SCREEN_WIDTH),
			y1 = Math.max(wsp.y, 0),
			y2 = Math.min(wsp.y + board.HEIGHT, player.SCREEN_HEIGHT);

		context.beginPath();
		context.fillStyle = '#060'
		context.rect(x1, y1, x2, y2);
		context.fill();
		context.closePath()
	},
	list: [],
	adjust: function() {
		player.SCREEN_WIDTH = $(window).width();
		player.SCREEN_HEIGHT = $(window).height();
		$('canvas').attr({
			width: player.SCREEN_WIDTH,
			height: player.SCREEN_HEIGHT
		});
	},
	draw: function() {
		for (var i = 0; i < board.list.length; i++) {
			var e = board.list[i];
			var wsp = game.rel(e.x1, e.y1);
			switch (e.type) {
				case 'box':
					context.drawImage(resources.list.box, wsp.x, wsp.y, e.x2 - e.x1, e.y2 - e.y1);
					break;
				default:
					break;
			}
		}
	},
	clear: function() {
		context.clearRect(0, 0, player.SCREEN_WIDTH, player.SCREEN_HEIGHT);
	},
	draw_play_button: function() {
		var ctx = context;
		var gradient = ctx.createLinearGradient(0, 0, player.SCREEN_WIDTH, 0);
		gradient.addColorStop("0", "magenta");
		gradient.addColorStop("0.5", "blue");
		gradient.addColorStop("1.0", "red");
		ctx.fillStyle = gradient;
		ctx.font = "80px Georgia";
		ctx.fillText("PLAY", player.SCREEN_WIDTH / 2 - 100, player.SCREEN_HEIGHT / 2);
	}
}


var tank = {
	list: {},
	shot: function() {
		game.audio.shot.cloneNode().play();
	},
	draw: function() {
		for (var i in tank.list) {
			var ctx = context;
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

			ctx.moveTo(wsp.x, wsp.y);

			ctx.arc(wsp.x, wsp.y, 10, 0, 2 * PI, false);
			ctx.fill();
			ctx.closePath();


			ctx.beginPath();
			ctx.lineWidth = 9;
			ctx.strokeStyle = '#fc0';
			ctx.arc(wsp.x, wsp.y, 14, 0, PI * ta.life / 5, false);
			ctx.stroke();
			ctx.closePath();

			ctx.beginPath();
			ctx.strokeStyle = '#f00';
			ctx.arc(wsp.x, wsp.y, 14, PI * ta.life / 5, 2 * PI, false);
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
	window.addEventListener('keydown', function(evt) {
		if (chat.isFocus == 1 && evt.which == 13 ) { // ENTER
			chat.submit();
		} else if (chat.isOpen == 1 && evt.which == 27) {
			chat.close();
		}
		else if (game.id in tank.list && !chat.isFocus) {
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
					chat.show();
					break;
				case 32: // SPACE
					$('#game').trigger('click');
					break;
				default:
					break;
			}
		}
	});
	window.addEventListener('keyup', function(e) {
		if (game.id in tank.list) {
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
		}
	});
	canvas.addEventListener('mousemove', function(evt) {
		if (game.id in tank.list) {
			var rect = canvas.getBoundingClientRect();
			tank.list[game.id].mPosX = evt.clientX - rect.left;
			tank.list[game.id].mPosY = evt.clientY - rect.top;
			socket.emit('client-event', {
				mx: evt.clientX - rect.left,
				my: evt.clientY - rect.top
			});
		}
	});
	$('#m').focus(function() {
		chat.isFocus = 1;
	}).blur(function() {
		chat.isFocus = 0;
	})
}

var bullets = {
	list: [],
	draw: function() {
		for (var i = 0; i < bullets.list.length; i++) {
			var b = bullets.list[i];
			var wsp = game.rel(b.x, b.y);
				
			context.beginPath();
			context.fillStyle = '#333';	
			context.arc(wsp.x, wsp.y, b.r, 0, 2 * PI, false);
			context.fill();
			context.closePath();
		}
	}
}

var resources = {
	list: {
		bg: (function() {
			var img = new Image();
			// img.src = './img/bg.jpg';
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