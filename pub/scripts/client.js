"use strict";

var ctx, canvas;
var act_ctx, act_canvas;
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
	ctx = canvas.getContext('2d');
	act_canvas = $('#active')[0];
	act_ctx = act_canvas.getContext('2d');
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
	ctx: null,
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

				var draw  = 0;
				if(game.msg1.tank[player.id].life != player.life) {
					player.life = game.msg1.tank[player.id].life;
					draw++;
				}
				if(game.msg1.tank[player.id].nuke != player.nuke) {
					player.nuke = game.msg1.tank[player.id].nuke
					draw++;
				} 
				if(game.msg1.tank[player.id].bullets != player.bullets) {
					player.bullets = game.msg1.tank[player.id].bullets;
					draw++;				
				}
				if(draw != 0) board.draw_icons();

				game.fps.count();
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

			ctx.font = "13px Arial";
			ctx.textAlign = "left";
			ctx.fillStyle = 'white'
			ctx.fillText('FPS: ' + Math.floor(1000 / t), 15, 15);
			ctx.fillText('PING: ' + Math.floor(game.ping.actual), 80, 15);
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
		ctx.beginPath();
		ctx.clearRect(0, 0, player.SCREEN_WIDTH, player.SCREEN_HEIGHT);
		ctx.fillStyle = '#060'
		ctx.fillRect(x1, y1, x2, y2);
		ctx.fill();
		ctx.closePath();
	},
	draw_icons: function() {

		act_ctx.clearRect(0, player.SCREEN_HEIGHT - 100, 400, 100);
		// LIFE
		act_ctx.beginPath();
		act_ctx.save();
		act_ctx.arc(60, player.SCREEN_HEIGHT - 50, 40, 0, 2 * Math.PI);
		act_ctx.clip();

		act_ctx.fillStyle = "red";
		act_ctx.fillRect(20, player.SCREEN_HEIGHT - game.msg1.tank[player.id].life * 0.8 - 10, 100, 100);
		act_ctx.restore();

		act_ctx.strokeStyle = '#000';
		act_ctx.lineWidth = 2;
		act_ctx.arc(60, player.SCREEN_HEIGHT - 50, 40, 0, 2 * Math.PI);
		act_ctx.stroke();
		act_ctx.closePath();

		act_ctx.fillStyle = 'white';
		act_ctx.textAlign = "center";
		act_ctx.font = "10px Arial";
		act_ctx.fillText(game.msg1.tank[player.id].life +' / 100', 60, player.SCREEN_HEIGHT - 50);

		// BULLETS
		act_ctx.beginPath();
		act_ctx.strokeStyle = '#AA0';
		act_ctx.lineWidth = 2;
		act_ctx.roundRect(120, player.SCREEN_HEIGHT - 70, 60, 60, 10);
		act_ctx.stroke();
		act_ctx.closePath();

		act_ctx.drawImage(resources.img.bullet, 0, 0, 199, 100, 95, player.SCREEN_HEIGHT - 65, 100, 50);
		act_ctx.fillStyle = 'white';
		act_ctx.font = "10px Arial";
		act_ctx.textAlign = "center";
		act_ctx.fillText('LPM', 150, player.SCREEN_HEIGHT - 74);
		act_ctx.font = "13px Arial";
		act_ctx.textAlign = "right";
		act_ctx.fillText(game.msg1.tank[player.id].bullets, 175, player.SCREEN_HEIGHT - 15);

		//NUKE 
		act_ctx.beginPath();
		act_ctx.strokeStyle = '#AA0';
		act_ctx.lineWidth = 2;
		act_ctx.roundRect(200, player.SCREEN_HEIGHT - 70, 60, 60, 10);
		act_ctx.stroke();
		act_ctx.closePath();

		act_ctx.drawImage(resources.img.nuke, 0, 0, 111, 134, 205, player.SCREEN_HEIGHT - 65, 45, 50);
		act_ctx.fillStyle = 'white';
		act_ctx.font = "10px Arial";
		act_ctx.textAlign = "center";
		act_ctx.fillText('PPM', 230, player.SCREEN_HEIGHT - 74);
		act_ctx.font = "13px Arial";
		act_ctx.textAlign = "right";
		act_ctx.fillText(game.msg1.tank[player.id].nuke, 255, player.SCREEN_HEIGHT - 15);
	},
	adjust: function() {
		player.SCREEN_WIDTH = Math.min($(window).outerWidth(), 1200);
		player.SCREEN_HEIGHT = Math.min($(window).outerHeight(), 600);
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
					ctx.drawImage(resources.img.box, wsp.x, wsp.y, e.x2 - e.x1, e.y2 - e.y1);
					break;
				default:
					break;
			}
		}
	},
	clear: function() {
		ctx.clearRect(0, 0, player.SCREEN_WIDTH, player.SCREEN_HEIGHT);
	},
	draw_play_button: function() {
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
		if (game.msg1.tank[player.id].bullets > 0) {
			var a = resources.audio.shot;
			var x = a.cloneNode();
			x.volume = a.volume;
			x.play();
		}
	},
	draw: function() {
		for (var i in game.msg1.tank) {
			if (i in game.msg2.tank) { // mógł zostać zabity

				var x = game.interp(game.msg1.tank[i].x, game.msg2.tank[i].x);
				var y = game.interp(game.msg1.tank[i].y, game.msg2.tank[i].y);
				var life = game.msg1.tank[i].life; // msg1 jest starsze

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
				ctx.arc(wsp.x, wsp.y, 14, 0, PI * life / 50, false);
				ctx.stroke();
				ctx.closePath();

				ctx.beginPath();
				ctx.strokeStyle = '#f00';
				ctx.arc(wsp.x, wsp.y, 14, PI * life / 50, 2 * PI, false);
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
		} else if (evt.which == 27) {
			settings.toggle();
		} else if (player.exist && !chat.isFocus) {
			switch (evt.which) {
				case 13: // Enter - czat
					chat.show();
					break;
				case 32: // SPACE
					if (game.space_shot == 1) {
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
	act_canvas.addEventListener('mousemove', function(evt) {
		if (player.exist) {
			var rect = act_canvas.getBoundingClientRect();
			socket.emit('client-event', {
				mx: evt.clientX - rect.left,
				my: evt.clientY - rect.top
			});
		}
	});
	window.addEventListener('contextmenu', function(evt) {
		evt.preventDefault();
	})
	act_canvas.addEventListener('click', function(evt) {
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

				ctx.beginPath();
				ctx.fillStyle = '#333';
				ctx.arc(wsp.x, wsp.y, r, 0, 2 * PI, false);
				ctx.fill();
				ctx.closePath();
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
		})(),
		bullet: (function() {
			var img = new Image();
			img.src = './img/bullet.png';
			return img;
		})(),
		nuke: (function() {
			var img = new Image();
			img.src = './img/nuke.png';
			return img;
		})(),
	},
	audio: {
		shot: (function() {
			var a = new Audio('audio/gun_shot.wav');
			a.volume = 0.5;
			return a;
		})()
	}
};



// DO ZROBIENIA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
var abilities = {
	nuke: {
		img: (function() {
			var img = new Image();
			img.src = './img/nuke.png';
			return img;
		})()
	},
	shot: {
		img: (function() {
			var img = new Image();
			img.src = './img/bullet.png';
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
};



var settings = {
	isOpen: 0,
	toggle: function() {
		(settings.isOpen == 1) ? settings.close(): settings.open()
	},
	open: function() {
		settings.isOpen = 1;
		$('body').append('<div id="settings"></div>');
		$('div#settings').load('/settings');
	},
	close: function() {
		settings.isOpen = 0;
		$('#settings').remove();
	}

}

CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	this.beginPath();
	this.moveTo(x + r, y);
	this.arcTo(x + w, y, x + w, y + h, r);
	this.arcTo(x + w, y + h, x, y + h, r);
	this.arcTo(x, y + h, x, y, r);
	this.arcTo(x, y, x + w, y, r);
	this.closePath();
	return this;
}
if (!Date.now) {
	Date.now = function() {
		return new Date().getTime();
	}
}