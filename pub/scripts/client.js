"use strict";

if (!Date.now) {
	Date.now = function() {
		return new Date().getTime();
	}
}

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

	socket_handlers();
	game_events();

	board.adjust();
	board.draw_play_button();
});


var packages = [];


var game = {
	timerId: null,
	package_nr: 0,
	delay: 100, // [ms]
	frame_time: 0,
	space_shot: 1,
	ping: {
		sum: 0,
		amount: 0,
		av: 0,
		actual: 0,
		addState: function(x) {
			this.actual = x;
			this.sum += x;
			this.amount += 1;
			this.av = this.sum / this.amount;
		},
	},
	context: null,
	counter: 0,
	play: function() {
		if (!player.exist) {
			cancelAnimationFrame(game.timerId);
			var msg = JSON.stringify(player);
			socket.emit('join-game', msg);
			game.draw();
		}
	},
	update: function(msg) {
		var msg = JSON.parse(msg);

		game.ping.addState(Date.now() - msg.date);

		if (msg.nr > game.package_nr) {
			game.package_nr = msg.nr;

			// Od najstarszych do najnowszych
			if (packages.length > 20) packages.pop();
			packages.unshift(msg);

		}
	},
	draw: function() {

		var t = Date.now() - game.delay + game.ping.av;
		game.frame_time = t;
		for (var i = 0; i < packages.length; i++) {
			if (t > packages[i].date) break;
		}
		game.ts_id = i;
		// czas t pomiędzy i-1 oraz i
		if (i < 21 && i >= 1) {
			if (player.id in packages[i].tank && player.id in packages[i - 1].tank) {
				player.exist = 1;
				game.msg1 = packages[i];
				game.msg2 = packages[i - 1];

				player.pos();

				board.draw_background();
				tank.draw();
				board.draw();
				bullets.draw();
				game.fps.count()
			} else {
				player.exist = 0;
				board.clear();
				board.draw_play_button();
			}
		}
		game.timerId = requestAnimationFrame(game.draw);
	},
	rel: function(x, y) {
		return {
			x: x + player.SCREEN_WIDTH / 2 - player.x,
			y: y + player.SCREEN_HEIGHT / 2 - player.y
		}
	},
	fps: {
		times: [],
		time_sum: 0,
		last_time: Date.now(),
		count: function() {
			var d = Date.now() - this.last_time;
			this.last_time = Date.now();

			this.times.unshift(d);
			if (this.times.length >= 50) this.time_sum -= this.times.pop();

			this.time_sum += d;
			var t = this.time_sum / this.times.length;

			context.font = "13px Arial";
			context.fillStyle = 'white'
			context.fillText('FPS: ' + Math.floor(1000 / t), 15, 15);
			context.fillText('PING: ' + Math.floor(game.ping.actual), 80, 15);
		}
	},
	disconnect: function() {
		alert("You are disconnected from the server");
	},
	interp: function(A, C) {
		// Zwraca wartość środkowej wartości
		// Ta & Tc - packages 
		// Tb - Animation time
		// A & C - Wartości odpowiadające Ta & Tc
		return (A * (game.msg2.date - game.frame_time) + C * (game.frame_time - game.msg1.date)) / (game.msg2.date - game.msg1.date);
	}
}

var player = {
	id: null,
	SCREEN_WIDTH: 1000,
	SCREEN_HEIGHT: 500,
	x: null,
	y: null,
	exist: 0,
	angle: 0, // kąt lufy
	pos: function() {
		player.x = game.interp(game.msg1.tank[player.id].x, game.msg2.tank[player.id].x);
		player.y = game.interp(game.msg1.tank[player.id].y, game.msg2.tank[player.id].y);
	}
}

var board = {
	WIDTH: 2000,
	HEIGHT: 1000,
	draw_background: function() {
		var wsp = game.rel(0, 0);
		var x1 = Math.max(wsp.x, 0),
			x2 = Math.min(wsp.x + board.WIDTH, player.SCREEN_WIDTH),
			y1 = Math.max(wsp.y, 0),
			y2 = Math.min(wsp.y + board.HEIGHT, player.SCREEN_HEIGHT);

		context.clearRect(0, 0, player.SCREEN_WIDTH, player.SCREEN_HEIGHT);
		context.fillStyle = '#060'
		context.rect(x1, y1, x2, y2);
		context.fill();
	},
	adjust: function() {
		player.SCREEN_WIDTH = $(window).outerWidth()
		player.SCREEN_HEIGHT = $(window).outerHeight();
		$('canvas').attr({
			width: player.SCREEN_WIDTH,
			height: player.SCREEN_HEIGHT
		});
		socket.emit('client-event', {
			sw: player.SCREEN_WIDTH,
			sh: player.SCREEN_HEIGHT
		})
	},
	draw: function() {
		for (var i = 0; i < game.msg1.board.length; i++) {

			var x = game.interp(game.msg1.board[i].x1, game.msg2.board[i].x1);
			var y = game.interp(game.msg1.board[i].y1, game.msg2.board[i].y1);

			var e = game.msg1.board[i];
			var wsp = game.rel(x, y);
			switch (e.type) {
				case 'box':
					context.drawImage(resources.img.box, wsp.x, wsp.y, e.x2 - e.x1, e.y2 - e.y1);
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
	shot: function() {
		resources.audio.shot.cloneNode().play();
	},
	draw: function() {
		for (var i in game.msg1.tank) {
			if (i in game.msg2.tank) { // mógł zostać zabity

				var x = game.interp(game.msg1.tank[i].x, game.msg2.tank[i].x);
				var y = game.interp(game.msg1.tank[i].y, game.msg2.tank[i].y);
				var life = game.msg1.tank[i].life; // msg1 jest starsze

				var ctx = context;

				var wsp = game.rel(x, y);

				if (player.id == i) {
					ctx.strokeStyle = '#333';
					ctx.fillStyle = '#333';
				} else {
					ctx.strokeStyle = '#c60';
					ctx.fillStyle = '#c60';
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
				ctx.arc(wsp.x, wsp.y, 14, 0, PI * life / 5, false);
				ctx.stroke();
				ctx.closePath();

				ctx.beginPath();
				ctx.strokeStyle = '#f00';
				ctx.arc(wsp.x, wsp.y, 14, PI * life / 5, 2 * PI, false);
				ctx.stroke();
				ctx.closePath();


				var l_x1 = game.interp(game.msg1.tank[i].lufa.x1, game.msg2.tank[i].lufa.x1);
				var l_x2 = game.interp(game.msg1.tank[i].lufa.x2, game.msg2.tank[i].lufa.x2);
				var l_y1 = game.interp(game.msg1.tank[i].lufa.y1, game.msg2.tank[i].lufa.y1);
				var l_y2 = game.interp(game.msg1.tank[i].lufa.y2, game.msg2.tank[i].lufa.y2);

				var wsp1 = game.rel(l_x1, l_y1);
				var wsp2 = game.rel(l_x2, l_y2);

				(player.id == i) ? ctx.strokeStyle = '#333': ctx.strokeStyle = '#c60';
				ctx.beginPath();
				ctx.moveTo(wsp1.x, wsp1.y);
				ctx.lineWidth = 6;
				ctx.lineTo(wsp2.x, wsp2.y);
				ctx.stroke();
				ctx.closePath();
			}
		}
	}
}

function game_events() {
	window.addEventListener('keydown', function(evt) {
		if (chat.isFocus == 1 && evt.which == 13) { // ENTER
			chat.submit();
		} else if (chat.isOpen == 1 && evt.which == 27) {
			chat.close();
		} else if (player.exist && !chat.isFocus) {
			switch (evt.which) {				
				case 13: // Enter - czat
					chat.show();
					break;
				case 32: // SPACE
					if(game.space_shot == 1) {
						$('#game').trigger('click');
						game.space_shot = 0;
					}
					break;
				case 37: // LEFT
				case 65: // A
					socket.emit('client-event', {
						dirX: -1,
					});
					break;
				case 38: // UP
				case 87: // W
					socket.emit('client-event', {
						dirY: -1,
					});
					break;
				case 39: // RIGHT
				case 68: // D
					socket.emit('client-event', {
						dirX: 1,
					});
					break;
				case 40: // DOWN
				case 83: // S
					socket.emit('client-event', {
						dirY: 1,
					});
					break;
				default:
					break;
			}
		}
	});
	window.addEventListener('keyup', function(evt) {
		if (player.exist) {
			switch (evt.which) {
				case 32: 
					game.space_shot = 1;
				break;
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
		}
	});
	window.addEventListener('resize', board.adjust);
	canvas.addEventListener('mousemove', function(evt) {
		if (player.exist) {
			var rect = canvas.getBoundingClientRect();
			socket.emit('client-event', {
				mx: evt.clientX - rect.left,
				my: evt.clientY - rect.top
			});
		}
	});
	canvas.addEventListener('click', function(evt) {
		if (!player.exist || player.id === null)
			game.play();
		else {
			tank.shot();
			socket.emit('client-event', {
				shot: true
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
	draw: function() {
		for (var i in game.msg1.bullets) {
			if (game.msg1.bullets[i] && game.msg2.bullets[i]) { // trzeba zamienić na identyfikatory!!!
				var x = game.interp(game.msg1.bullets[i].x, game.msg2.bullets[i].x);
				var y = game.interp(game.msg1.bullets[i].y, game.msg2.bullets[i].y);
				var r = 5;
				var wsp = game.rel(x, y);

				context.beginPath();
				context.fillStyle = '#333';
				context.arc(wsp.x, wsp.y, r, 0, 2 * PI, false);
				context.fill();
				context.closePath();
			}
		}
	}
}

var resources = {
	img: {
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
	},
	audio: {
		shot: (function() {
			var a = new Audio('audio/gun_shot.wav');
			a.volume = 0.5;
			return a;
		})()
	}
};

// prototyp wektora
var vector = function(x, y) {
	this.x = x;
	this.y = y;
	this.size = Math.sqrt(x * x + y * y);
	this.unit = {
		x: this.x / this.size,
		y: this.y / this.size
	};
};