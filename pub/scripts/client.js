"use strict";

var ctx, canvas;
var act_ctx, act_canvas;
var socket = io();
var packages = [];

// Socket Event Handlers
function socket_handlers() {
	socket.on('message', chat.message)
	socket.on('n-message', chat.neutral_message);
	socket.on('clients', chat.clients);
	socket.on('disconnect', game.disconnect);
	socket.on('game-update', game.update);
	socket.on('join', game.join);
	socket.on('game-ping', game.get_ping);
	socket.on('get-players', game.get_players);
	socket.on('map', game.get_map);
}

window.setInterval(function() {
	socket.emit('game-ping', Date.now());
}, 1000);

window.addEventListener('load', function load() {
	canvas = $('#game')[0];
	ctx = canvas.getContext('2d');
	act_canvas = $('#active')[0];
	act_ctx = act_canvas.getContext('2d');
	settings.load();
	chat.load();
	socket_handlers();
	game_events();
	game.ab.display_right();
	board.adjust();
	game.play();
});

var game = {

	timerId: null,
	package_nr: 0,
	delay: 100, // [ms]
	frame_time: 0,
	space_shot: 1,
	animations: [],
	get_ping: function(msg) {
		debug.ping2.addState(Date.now() - parseInt(msg));
	},
	play: function() { // start lub kontynuacja gry
		var msg = JSON.stringify({
			SCREEN_HEIGHT: player.SCREEN_HEIGHT,
			SCREEN_WIDTH: player.SCREEN_WIDTH,
			nick: localStorage.getItem('nick')
		});
		socket.emit('join-game', msg);
	},
	update: function(msg) { // Odbieranie pakietów
		var msg = JSON.parse(msg);

		debug.ping.addState(Date.now() - msg.ts);

		if (msg.nr > game.package_nr) {
			game.package_nr = msg.nr;

			// Od najstarszych do najnowszych
			if (packages.length > 20) packages.pop();
			packages.unshift(msg);

		}
	},
	disconnect: function() {
		//location.href = './';
		$('#messages').append('<li class="neutral"><DISCONNECTED/li>');
	},
	join: function(msg) {
		player.id = socket.id;



		var m = JSON.parse(msg)
		board.WIDTH = board.WIDTH || m.width;
		board.HEIGHT = board.HEIGHT || m.height;
		window.map = m.map;
		if (!game.timerId) {
			setTimeout(game.draw, 300);
		}
	},
	draw: function() { // główna pętla gry
		var t = Date.now() - (game.delay + debug.ping.av());
		game.frame_time = t;

		for (var i = 0; i < packages.length; i++) {
			if (t > packages[i].ts) break;
		}
		game.ts_id = i;

		if (packages.length > 0) {
			if (packages[0].mc.length !== 0) {
				for (var j = 0; j < packages[0].mc.length; j++) {
					map.layers[1].data[packages[0].mc[j][0]] = packages[0].mc[j][1];
				}
			}
		}

		// czas t pomiędzy i-1 oraz i
		if (i < 21 && i >= 1) {

			if (player.id in packages[i].t && player.id in packages[i - 1].t) {

				player.exist = 1;

				var m = game.msg1 = packages[i - 1];
				game.msg2 = packages[i];

				debug.log.init();
				debug.log.mid_times.length = 0;

				player.pos();
				board.draw_background();
				board.draw_sp_objects();
				debug.log.addState(); // 0

				board.draw();
				debug.log.addState() // 1

				tank.draw();
				debug.log.addState(); // 2

				bullets.draw();
				debug.log.addState(); // 3

				board.draw_animations();

				var draw = 0;

				if (player.life != m.t[player.id].lf) {
					player.life = m.t[player.id].lf;
					draw++;
				}
				if (player.ab.shot != m.t[player.id].ab[0]) {
					player.ab.shot = m.t[player.id].ab[0];
					draw++;
				}
				if (player.ab.nuke != m.t[player.id].ab[1]) {
					player.ab.nuke = m.t[player.id].ab[1]
					draw++;
				}
				if (player.ab.tar_keg != m.t[player.id].ab[2]) {
					player.ab.tar_keg = m.t[player.id].ab[2];
					draw++;
				}
				if (draw != 0) board.draw_icons();
				debug.log.addState(); // 4

				var actions = {
					a: game.animate,
					m: chat.murders
				};

				for (var j in actions) {
					for (var k = 0; k < m[j].length; k++) {
						actions[j].call(this, m[j][k])
					}
					m[j].length = 0; // zapobiega ponownemu odtowrzeniu, gdy nie ma nowego pakietu danych
				}

				debug.log.addState(); // 5

				game.res_changes.check();

				debug.fps.count();
				game.info();

				debug.log.addState(); // 6

				for (var j = 0; j < debug.log.mid_times.length; j++) {
					if (debug.log.mid_times[j] > 15) logs['LAG_' + j] ++;
				}
			} else {
				board.clear();
				board.draw_killed();

				$('#hp div').height(0);
				$('#hp span').text('0 / ' + player.html.max_hp);

				game.timerId = null;
				setTimeout(function() {
					socket.emit('reborn')
				}, 1000);
				return;
			}
		} else logs["no_packages"] ++;
		game.timerId = requestAnimationFrame(game.draw);
	},
	rel: function(x, y) {
		return {
			x: x + player.SCREEN_WIDTH / 2 - player.x,
			y: y + player.SCREEN_HEIGHT / 2 - player.y
		}
	},
	info: function() {
		ctx.font = "13px Arial";
		ctx.textAlign = "left";
		ctx.fillStyle = 'white'
		ctx.fillText('FPS: ' + debug.fps.av(), 15, 15);
		ctx.fillText('PING ' + debug.ping2.av(), 15, 30);

		ctx.font = "13px Arial";
		ctx.fillText('KILLS: ' + game.msg1.t[player.id].k, 90, 15);
		ctx.fillText('DEATHS: ' + game.msg1.t[player.id].d, 170, 15);
		$('#clients').text('Online: ' + Object.keys(packages[0].t).length);
	},
	interp: function(A, C) { // Interpolacja
		// Zwraca wartość środkowej wartości
		// A & C - Wartości odpowiadające msg1 & msg2
		if (A != C) return (C * (game.msg1.ts - game.frame_time) + A * (game.frame_time - game.msg2.ts)) / (game.msg1.ts - game.msg2.ts);
		else return A;
	},
	animate: function(msg) {
		var t = game.msg1.t[player.id];
		// volume = (6*base_volume) / log_2(odleglosc + 64) - do dodania!!!

		var a = abilities[msg.ab].audio;
		if (a) {
			var x = a.cloneNode(true);
			x.volume = (6 * game.volume) / Math.log2((msg.x - t.x) * (msg.x - t.x) + (msg.y - t.y) * (msg.y - t.y) + 64)
			x.play();
		}

		var a = abilities[msg.ab].animation;
		if (a) new Sprite(a.src, msg.x, msg.y, a.size, a.speed);
	},
	get_players: function(msg) {
		console.log(JSON.parse(msg));
	},

	get_map: function(msg) {
		if (map) map.layers[1].data = msg.split('');
	},
	res_changes: {
		check: function() {
			var t1 = game.msg1.t[player.id];
			var t2 = game.msg2.t[player.id];
			if (!game.msg1.res_checked) {
				if (t1.ab[0].a > t2.ab[0].a) { // a - amount
					this.animate('You received ' + (t1.ab[0].a - t2.ab[0].a) + ' bullets');
				}
				if (t1.ab[1].a > t2.ab[1].a) {
					this.animate('You received ' + (t1.ab[1].a - t2.ab[1].a) + ' nukes');
				}
				if (t1.lf > t2.lf) {
					this.animate('You healed ' + (t1.lf - t2.lf) + ' damage');
				}
				if (t1.ab[2].a > t2.ab[2].a) {
					this.animate('You received ' + (t1.ab[2].a - t2.ab[2].a) + ' tar kegs');
				}
				if (!!t1.a.sb > !!t2.a.sb) {
					this.animate('You gained speed bust');
				}
				game.msg1.res_checked = true;
			}
		},
		animate: function(text) {
			$('.game_msg:hidden').remove();
			$('.game_msg').css('top', '+=20');
			$('#main').append('<div class="game_msg"></div>');
			$('.game_msg:last-child')
				.text(text)
				.animate({
					left: player.SCREEN_WIDTH / 2 - $('.game_msg:last-child').width() / 2,
					top: player.SCREEN_HEIGHT / 2 - $('.game_msg:last-child').height() / 2 + 30,
				}, 0)
				.delay(2000)
				.fadeOut('1000')
			return $('.game_msg:last-child');
		}
	},
	ab: {
		get: function(x) {
			var s = 0;
			for (var i in player.ab) {
				if (s == x) {
					player.active_ability = i;
					this.display_right();
					//show_ab_info();
				}
				if (player.ab.hasOwnProperty(i) && i != 'shot') {
					s++
				}
			}
		},
		switch: function() {
			var ab = null;
			var found = false;
			var first = null;
			for (var i in player.ab) {
				if (player.ab.hasOwnProperty(i) && player.ab[i].a != 0 && i != 'shot') {
					if (!first) first = i;
					if (found) ab = i;
					if (i == player.active_ability) found = 1;
				}
			}
			player.active_ability = ab || first || 1;
			this.display_right();
		},
		display_right: function() {
			$('#ppm').css('background-image', 'url("' + abilities[player.active_ability].img.src + '")');
			if (game.msg1) $('#ppm .amount').text(game.msg1.t[player.id].ab[player.tr[player.active_ability]].a);
		},
		show_info: function(e) {
			var id = e ? e.target.id : 'ppm';	
			var ability = (id == 'lpm') ? 'shot' : player.active_ability;
			var cechy = player.ab[ability];
			var changes = {
				d: 'Obrażenia',
				r: 'Promień',
				a: 'Ilość'
			}
			
			$('.opis').remove();
			$('#' + id).append('<div class="opis"></div>');
			for (var i in cechy) {
				if (i == 'a') continue;
				$('.opis').append('<div class="oopis">');
				$('.oopis:last-child').append('<div class="cecha">' + changes[i] + ':</div>')
					.append('<div class="value">' + cechy[i] + '</div>');
			}
			var x = $('.oopis:last-child').clone().prependTo('.opis');
			x.find('.cecha').text('Opis');
			x.find('.value').text(abilities[ability].opis);


		},
		remove_info: function() {
			$('.opis').remove();
		},
	},
}

var debug = {
	pl: function() {
		console.log(JSON.stringify(packages[0]).length);
	},
	sl: function() {
		return packages[0].sl;
	},
	log: {
		mid_times: [],
		time: 0,
		addState: function() {
			this.mid_times.push(Date.now() - this.time);
			this.time = Date.now()
		},
		init: function() {
			this.time = Date.now()
		}
	},
	ping: {
		times: [1],
		time_sum: 1,
		addState: function(x) {
			this.times.unshift(x);
			if (this.times.length >= 50) this.time_sum -= this.times.pop();
			this.time_sum += x;
		},
		av: function() {
			return this.time_sum / this.times.length;
		}
	},
	ping2: {
		times: [1],
		time_sum: 1,
		addState: function(x) {
			this.times.unshift(x);
			if (this.times.length >= 50) this.time_sum -= this.times.pop();
			this.time_sum += x;
		},
		av: function() {
			return Math.round(this.time_sum / this.times.length);
		}
	},
	fps: {
		times: [60],
		time_sum: 60,
		last_time: Date.now(),
		count: function() {
			var d = Date.now() - this.last_time;
			this.last_time = Date.now();
			this.times.unshift(d);
			if (this.times.length >= 50) this.time_sum -= this.times.pop();
			this.time_sum += d;
		},
		av: function() {
			return Math.round(1000 / (this.time_sum / this.times.length));
		}

	},
}

var player = {
	id: null,
	SCREEN_WIDTH: 1000,
	SCREEN_HEIGHT: 500,
	x: null,
	y: null,
	exist: 0,
	angle: 0, // kąt lufy - do dodania
	pos: function() {
		player.x = game.interp(game.msg1.t[player.id].x, game.msg2.t[player.id].x);
		player.y = game.interp(game.msg1.t[player.id].y, game.msg2.t[player.id].y);
	},
	ab: {},
	active_ability: 'nuke',
	html: {
		hp: 0,
		lpm_amount: 0,
		ppm_amount: 0
	},
	tr: { // transform
		shot: 0,
		nuke: 1,
		tar_keg: 2
	}
}

var board = {
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
	draw_killed: function() {

		ctx.fillStyle = 'white';
		ctx.textAlign = "center";
		ctx.font = "100px Lato";
		ctx.fillText('Zostałeś zabity', player.SCREEN_WIDTH / 2, player.SCREEN_HEIGHT / 2);
	},
	draw_sp_objects: function() {
		for (var i in game.msg1.sp) {
			if (i in game.msg2.sp) {
				var ob1 = game.msg1.sp[i];
				var ob2 = game.msg2.sp[i];
				var x = game.interp(ob1.x, ob2.x);
				var y = game.interp(ob1.y, ob2.y);
				var wsp = game.rel(x, y);
				switch (game.msg1.sp[i].k) {
					case 'd': // dark spot
						var r = game.interp(ob1.r, ob2.r);
						ctx.beginPath();
						ctx.fillStyle = 'rgba(0, 0, 0, ' + ob1.o + ')';
						ctx.beginPath();
						ctx.arc(wsp.x, wsp.y, r, 0, 2 * Math.PI);
						ctx.fill();
						ctx.closePath();
						break;
					case 'n': // nuke mark
						var mark = abilities.nuke.mark;
						ctx.drawImage(mark, wsp.x - mark.width / 2, wsp.y - mark.width / 2, 32, 32);
						break;
					default:
						logs['dziwny_obiekt'] ++
				}
			}
		}
	},
	draw_icons: function() {
		var t = game.msg1.t[player.id]

		if (player.html.hp != t.lf) {
			$('#hp div').height(t.lf / t.mlf * 80);
			$('#hp span').text(t.lf + ' / ' + t.mlf);
			player.html.hp = t.lf
			player.html.max_hp = t.mlf;
		}
		if (player.html.lpm != t.ab[0].a) {
			$('#lpm .amount').text(t.ab[0].a)
			player.html.lpm = t.ab[0].a;
		}
		// Abilities
		if (player.html.ppm != t.ab[player.tr[player.active_ability]].a) {
			$('#ppm .amount').text(t.ab[player.tr[player.active_ability]].a);
			player.html.ppm = t.ab[player.tr[player.active_ability]].a;
		}

	},
	draw_animations: function() {
		for (var i = 0; i < game.animations.length; i++) {
			if (game.animations[i].index + 1 < game.animations[i].frames.length) {
				game.animations[i].render();
			} else {
				game.animations.splice(i, 1);
				i--;
			}
		}
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
		});
		$('#main').css('height', player.SCREEN_HEIGHT)
		if (game.msg1) board.draw_icons();

		if ((window.outerHeight - window.innerHeight) > 100) {
			// alert("Don't even try to hack this game ;)");
		}

	},
	draw: function() {
		if (map) {
			for (var i = 0; i < map.layers[1].data.length; i++) {
				var tc = map.layers[1].data[i]; // tile content
				var tc2 = map.layers[0].data[i]; // background
				if (tc == 0 && tc2 == 0) {
					continue;
				}

				var bw = board.WIDTH / 64;
				var x = i % bw;
				var y = (i - x) / bw;


				var wsp = game.rel(x * 64, y * 64);

				if (wsp.x > -64 && wsp.y > -64 && wsp.x < player.SCREEN_WIDTH + 64 && wsp.y < player.SCREEN_HEIGHT + 64) {
					if (tc2 && !game.brak_trawy) ctx.drawImage(resources.img.grass, tc2 * 64 - 11 * 64, 0, 64, 64, wsp.x, wsp.y, 64, 64);
					if (tc) ctx.drawImage(resources.img.tileset, tc * 64 - 64, 0, 64, 64, wsp.x, wsp.y, 64, 64);

				}
			}
		} else logs['brak_mapy'] ++;
	},
	clear: function() {
		ctx.clearRect(0, 0, player.SCREEN_WIDTH, player.SCREEN_HEIGHT);
	},
}

var tank = {
	ab: function(ability) {
		if (game.msg1.t[player.id].ab[player.tr[ability]].a > 0) {
			socket.emit('client-event', {
				ability: ability,
				mx: player.mx,
				my: player.my
			});
		}
	},
	draw: function() {
		for (var i in game.msg1.t) {
			if (i in game.msg2.t) { // mógł zostać zabity
				var t1 = game.msg1.t[i];
				var t2 = game.msg2.t[i];
				var x = game.interp(t1.x, t2.x);
				var y = game.interp(t1.y, t2.y);
				var life = t1.lf;
				var max_life = t1.mlf;
				var wsp = game.rel(x, y);

				if (player.id == i) {
					ctx.strokeStyle = '#333';
					ctx.fillStyle = '#333';
				} else {
					ctx.strokeStyle = '#c60';
					ctx.fillStyle = '#c60';
				}

				ctx.beginPath();
				ctx.arc(wsp.x, wsp.y, 20, 0, 2 * Math.PI, false);
				ctx.lineWidth = 3;
				ctx.stroke();

				ctx.moveTo(wsp.x, wsp.y);

				ctx.arc(wsp.x, wsp.y, 10, 0, 2 * Math.PI, false);
				ctx.fill();
				ctx.closePath();


				ctx.beginPath();
				ctx.lineWidth = 9;
				ctx.strokeStyle = '#fc0';
				ctx.arc(wsp.x, wsp.y, 14, 0, 2 * Math.PI * life / max_life, false);
				ctx.stroke();
				ctx.closePath();

				ctx.beginPath();
				ctx.strokeStyle = '#f00';
				ctx.arc(wsp.x, wsp.y, 14, 2 * Math.PI * life / max_life, 2 * Math.PI, false);
				ctx.stroke();
				ctx.closePath();


				var l_x1 = game.interp(t1.l.x1, t2.l.x1) / 10;
				var l_x2 = game.interp(t1.l.x2, t2.l.x2) / 10;
				var l_y1 = game.interp(t1.l.y1, t2.l.y1) / 10;
				var l_y2 = game.interp(t1.l.y2, t2.l.y2) / 10;

				var wsp1 = game.rel(l_x1, l_y1);
				var wsp2 = game.rel(l_x2, l_y2);

				(player.id == i) ? ctx.strokeStyle = '#333': ctx.strokeStyle = '#c60';
				ctx.beginPath();
				ctx.moveTo(wsp1.x, wsp1.y);
				ctx.lineWidth = 6;
				ctx.lineTo(wsp2.x, wsp2.y);
				ctx.stroke();
				ctx.closePath();

				if (player.id != i) {
					ctx.font = "13px Arial";
					ctx.textAlign = "center";
					ctx.fillStyle = 'white'
					ctx.fillText(t1.n + ' [' + t1.k + '/' + t1.d + '] ', wsp.x, wsp.y - 30);
				}
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
				case 8: // Backspace
					if (evt.target.nodeName == CANVAS || evt.target.nodeName == DOCUMENT)
						evt.preventDefault();
					break;
				case 9: // TAB
				case 20: //capslock
					evt.preventDefault();
					game.ab.switch();
					break;
				case 13: // Enter - czat
					chat.show();
					break;
				case 32: // SPACE
					if (game.space_shot == 1) {
						tank.ab('shot');
						game.space_shot = 0;
					}
					break;
				case 49: // 1
					game.get_ab(0);
					break;
				case 50: // 2
					game.get_ab(1);
					break;
				case 51: // 2
					game.get_ab(1);
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
			player.mx = evt.clientX - rect.left;
			player.my = evt.clientY - rect.top;
		}
	});

	window.addEventListener('contextmenu', function(evt) {
		evt.preventDefault();
		if (evt.target.nodeName == 'CANVAS') {
			var rect = act_canvas.getBoundingClientRect();
			player.mx = evt.clientX - rect.left;
			player.my = evt.clientY - rect.top;
			tank.ab(player.active_ability);
		}
	})
	act_canvas.addEventListener('click', function(evt) {
		if (player.exist) {
			var rect = act_canvas.getBoundingClientRect();
			player.mx = evt.clientX - rect.left;
			player.my = evt.clientY - rect.top;
			tank.ab('shot');
		}
	});
	$('#ppm').click(game.switch_weapons);
	$('#ppm, #lpm').mouseover(game.ab.show_info)
		.mouseout(game.ab.remove_info);
}

var bullets = {
	draw: function() {
		for (var i in game.msg1.b) {
			if (game.msg1.b[i] && game.msg2.b[i]) {
				var x = game.interp(game.msg1.b[i].x, game.msg2.b[i].x);
				var y = game.interp(game.msg1.b[i].y, game.msg2.b[i].y);
				var r = 5;
				var wsp = game.rel(x, y);

				ctx.beginPath();
				ctx.fillStyle = '#333';
				ctx.arc(wsp.x, wsp.y, r, 0, 2 * Math.PI, false);
				ctx.fill();
				ctx.closePath();
			}
		}
	}
}

/*************************** SPRITES *******************************/

var Sprite = function(url, dx, dy, size, sp, w, h, frames, index, loop, fromCenter) {
	this.img = new Image();
	this.img.src = url;
	this.frames = frames || Array.apply(null, {
		length: size
	}).map(Number.call, Number); // np. [1,2,3,2,1]
	this.size = size; // długość sprite'a
	this.loop = loop || false;
	this.index = index || 0;
	this.speed = 1000 / sp;
	this.dx = dx;
	this.dy = dy;
	this.fromCenter = fromCenter === false ? false : true;


	var that = this;
	this.img.onload = function() {
		that.width = w || that.img.width / size;
		that.height = h || that.img.height;

		if (that.fromCenter) {
			that.dx -= that.width / 2;
			that.dy -= that.height / 2;
		}

		that.render();
		setTimeout(that.next, that.speed, that);
	}
	game.animations.push(this);
}

Sprite.prototype.next = function(that) {

	var wsp = game.rel(that.dx, that.dy);
	if (!that.loop && that.index + 1 >= that.frames.length) {} else {
		that.index = (++that.index) % that.frames.length;
		setTimeout(that.next, that.speed, that);
	}
}

Sprite.prototype.render = function() {
	var wsp = game.rel(this.dx, this.dy);
	ctx.drawImage(this.img,
		this.width * this.frames[this.index], 0, // sx, sy
		this.width, this.height, //source width and height
		wsp.x, wsp.y, // destination x and y
		this.width, this.height
	)
}