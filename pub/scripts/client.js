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
	game.display_right_ab();
	board.adjust();
	game.play();
});

var game = {
	mid_times: [],
	timerId: null,
	package_nr: 0,
	delay: 100, // [ms]
	frame_time: 0,
	space_shot: 1,
	volume: 0.5,
	ctx: null,
	counter: 0,
	animations: [],
	get_ping: function(msg) {
		game.ping2.addState(Date.now() - parseInt(msg));
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

		game.ping.addState(Date.now() - msg.timestamp);

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
		var t = Date.now() - (game.delay + game.ping.av());
		game.frame_time = t;

		for (var i = 0; i < packages.length; i++) {
			if (t > packages[i].timestamp) break;
		}
		game.ts_id = i;

		map = packages[0].map;
		// czas t pomiędzy i-1 oraz i
		if (i < 21 && i >= 1) {

			if (player.id in packages[i].tank && player.id in packages[i - 1].tank) {
				player.exist = 1;

				var m = game.msg1 = packages[i - 1];
				game.msg2 = packages[i];

				game.log.init();
				game.mid_times.length = 0;

				player.pos();
				board.draw_background();
				board.draw_sp_objects();
				game.log.addState(); // 0

				board.draw();
				game.log.addState() // 1

				tank.draw();
				game.log.addState(); // 2

				bullets.draw();
				game.log.addState(); // 3

				board.draw_animations();

				var draw = 0;

				if (m.tank[player.id].life != player.life) {
					player.life = m.tank[player.id].life;
					draw++;
				}
				if (m.tank[player.id].ab.nuke != player.ab.nuke) {
					player.ab.nuke = m.tank[player.id].ab.nuke;
					draw++;
				}
				if (m.tank[player.id].ab.shot != player.ab.shot) {
					player.ab.shot = m.tank[player.id].ab.shot;
					draw++;
				}
				if (m.tank[player.id].ab.tar_keg != player.ab.tar_keg) {
					player.ab.tar_keg = m.tank[player.id].ab.tar_keg;
					draw++;
				}
				if (draw != 0) board.draw_icons();
				game.log.addState(); // 4

				var actions = {
					animations: game.animate,
					murders: chat.murders
				};

				for(var j in actions) {
					for(var k=0; k < m[j].length; k++) {
						actions[j].call(this, m[j][k])
					}
					m[j].length = 0; // zapobiega ponownemu odtowrzeniu, gdy nie ma nowego pakietu danych
				}
				/*
				if (m.sounds.length !== 0) {
					for (var j = 0; j < m.sounds.length; j++) {
						game.play_sound(m.sounds[j]);
					}
					m.sounds.length = 0; //zapobiega ponownemu odtworzeniu pliku, gdy nie ma nowego pakietu danych
				}

				if (m.animations.length !== 0) {
					for (var j = 0; j < m.animations.length; j++) {
						game.animate(m.animations[j]);
					}
					m.animations.length = 0; //zapobiega ponownej animacji, gdy nie ma nowego pakietu danych
				}

				if (m.murders.length !== 0) {
					for (var j = 0; j < m.murders.length; j++) {
						game.animate(m.animations[j]);
					}
				}
				*/
				game.log.addState(); // 5

				game.res_changes.check();

				game.fps.count();
				game.info();

				game.log.addState(); // 6

				for (var j = 0; j < game.mid_times.length; j++) {
					if (game.mid_times[j] > 15) logs['LAG_' + j]++;
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
		} else logs["no_packages"]++;
		game.timerId = requestAnimationFrame(game.draw);
	},
	rel: function(x, y) {
		return {
			x: x + player.SCREEN_WIDTH / 2 - player.x,
			y: y + player.SCREEN_HEIGHT / 2 - player.y
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
	info: function() {
		ctx.font = "13px Arial";
		ctx.textAlign = "left";
		ctx.fillStyle = 'white'
		ctx.fillText('FPS: ' + game.fps.av(), 15, 15);
		ctx.fillText('PING ' + game.ping2.av(), 15, 30);
		// ctx.fillText('SL: ' + game.msg1.server_latency, 15, 30);

		ctx.font = "13px Arial";
		ctx.fillText('KILLS: ' + game.msg1.tank[player.id].kills, 90, 15);
		ctx.fillText('DEATHS: ' + game.msg1.tank[player.id].deaths, 170, 15);
		$('#clients').text('Online: ' + Object.keys(packages[0].tank).length);
	},
	interp: function(A, C) { // Interpolacja
		// Zwraca wartość środkowej wartości
		// A & C - Wartości odpowiadające msg1 & msg2
		if (A != C) return (C * (game.msg1.timestamp - game.frame_time) + A * (game.frame_time - game.msg2.timestamp)) / (game.msg1.timestamp - game.msg2.timestamp);
		else return A;
	},
	animate: function(msg) {

		// volume = (6*base_volume) / log_2(odleglosc + 64) - do dodania!!!

		var a = abilities[msg.ab].audio;
		if(a) {
			var x = a.cloneNode(true);
			x.volume = game.volume;
			x.play();
		}
		
		var a = abilities[msg.ab].animation;
		if(a) new Sprite(a.src, msg.x, msg.y, a.size, a.speed);
	},
	log: {
		time: 0,
		addState: function() {
			game.mid_times.push(Date.now() - game.log.time);
			game.log.time = Date.now()
		},
		init: function() {
			game.log.time = Date.now()
		}
	},
	res_changes: {
		check: function() {
			var t1 = game.msg1.tank[player.id];
			var t2 = game.msg2.tank[player.id];
			if (!game.msg1.res_checked) {
				if (t1.ab.shot.amount > t2.ab.shot.amount) {
					this.animate('You received ' + (t1.ab.shot.amount - t2.ab.shot.amount) + ' bullets');
				}
				if (t1.ab.nuke.amount > t2.ab.nuke.amount) {
					this.animate('You received ' + (t1.ab.nuke.amount - t2.ab.nuke.amount) + ' nukes');
				}
				if (t1.life > t2.life) {
					this.animate('You healed ' + (t1.life - t2.life) + ' damage');
				}
				if (t1.ab.tar_keg.amount > t2.ab.tar_keg.amount) {
					this.animate('You received ' + (t1.ab.tar_keg.amount - t2.ab.tar_keg.amount) + ' tar kegs');
				}
				if (!!t1.auras.sb > !!t2.auras.sb) {
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
	switch_weapons: function() {
		var ab = null;
		var found = false;
		var first = null;
		for (var i in player.ab) {
			if (player.ab.hasOwnProperty(i) && player.ab[i] != 0 && i != 'shot') {
				if (!first) first = i;
				if (found) ab = i;
				if (i == player.active_ability) found = 1;
			}
		}
		player.active_ability = ab || first || 'nuke';
		game.display_right_ab();
		//game.show_ab_info();
	},
	get_ab: function(x) {
		var s = 0;
		for (var i in player.ab) {
			if (s == x) {
				player.active_ability = i;
				game.display_right_ab();
				//show_ab_info();
			}
			if (player.ab.hasOwnProperty(i) && i != 'shot') {
				s++
			}
		}
	},
	display_right_ab: function() {
		$('#ppm').css('background-image', 'url("' + abilities[player.active_ability].img.src + '")');
		if (game.msg1) $('#ppm .amount').text(game.msg1.tank[player.id].ab[player.active_ability].amount);
	},
	get_players: function(msg) {
		console.log(JSON.parse(msg));
	},
	show_ab_info: function(e) {
		var id = e? e.target.id : 'ppm';
		$('.opis').remove();
		var changes = {
			'dmg': 'Obrażenia',
			'radius': 'Promień',
			'opis': 'Opis',
			'amount': 'Ilość'
		}
		$('#' + id).append('<div class="opis"></div>');
		var a = (id == 'lpm')? player.ab['shot'] : player.ab[player.active_ability]
		for(var i in a) {
			$('.opis').append('<div class="oopis">');
			$('.oopis:last-child').append('<div class="cecha">' + changes[i] + ':</div>')
				.append('<div class="wartosc">' + a[i] + '</div>');
		}
	},
	remove_ab_info: function() {
		$('.opis').remove();
	}

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
		player.x = game.interp(game.msg1.tank[player.id].x, game.msg2.tank[player.id].x);
		player.y = game.interp(game.msg1.tank[player.id].y, game.msg2.tank[player.id].y);
	},
	ab: {},
	active_ability: 'nuke',
	html: {
		hp: 0,
		lpm_amount: 0,
		ppm_amount: 0
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
		ctx.fillText('Zostałeś zabity', player.SCREEN_WIDTH/2, player.SCREEN_HEIGHT/2);
	},
	draw_sp_objects: function() {
		for (var i in game.msg1.sp_objects) {
			if (i in game.msg2.sp_objects) {
				var ob1 = game.msg1.sp_objects[i];
				var ob2 = game.msg2.sp_objects[i];
				var x = game.interp(ob1.x, ob2.x);
				var y = game.interp(ob1.y, ob2.y);
				var wsp = game.rel(x, y);
				switch (game.msg1.sp_objects[i].kind) {	
						case 'dark-spot':				
						var r = game.interp(ob1.r, ob2.r);
						ctx.beginPath();
						ctx.fillStyle = 'rgba(0, 0, 0, ' + ob1.op + ')';
						ctx.beginPath();
						ctx.arc(wsp.x, wsp.y, r, 0, 2 * Math.PI);
						ctx.fill();
						ctx.closePath();	
						break;
					case 'nuke-mark':
						var mark = abilities.nuke.mark;
						ctx.drawImage(mark, wsp.x - mark.width/2, wsp.y - mark.width/2, 32, 32);
						break;
					default:
						logs['dziwny_obiekt']++
					}
			}
		}
	},
	draw_icons: function() {
		var t = game.msg1.tank[player.id]

		if(player.html.hp != t.life) {
			$('#hp div').height(t.life /  t.max_life * 80);
			$('#hp span').text(t.life + ' / ' + t.max_life);
			player.html.hp = t.life
			player.html.max_hp = t.max_life;
		}
		if(player.html.lpm != t.ab.shot.amount) {
			$('#lpm .amount').text(t.ab.shot.amount)
			player.html.lpm = t.ab.shot.amount;
		}
		// Abilities
		if(player.html.ppm != t.ab[player.active_ability].amount) {
			$('#ppm .amount').text(t.ab[player.active_ability].amount);
			player.html.ppm = t.ab[player.active_ability].amount;
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
		} else logs['brak_mapy']++;
	},
	clear: function() {
		ctx.clearRect(0, 0, player.SCREEN_WIDTH, player.SCREEN_HEIGHT);
	},
}

var tank = {
	ab: function(ability) {
		if (game.msg1.tank[player.id].ab[ability].amount > 0) {
			socket.emit('client-event', {
				ability: ability,
				mx: player.mx,
				my: player.my
			});
		}
	},
	draw: function() {
		for (var i in game.msg1.tank) {
			if (i in game.msg2.tank) { // mógł zostać zabity
				var t1 = game.msg1.tank[i];
				var t2 = game.msg2.tank[i];
				var x = game.interp(t1.x, t2.x);
				var y = game.interp(t1.y, t2.y);
				var life = t1.life; 
				var max_life = t1.max_life;
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


				var l_x1 = game.interp(t1.lufa.x1, t2.lufa.x1);
				var l_x2 = game.interp(t1.lufa.x2, t2.lufa.x2);
				var l_y1 = game.interp(t1.lufa.y1, t2.lufa.y1);
				var l_y2 = game.interp(t1.lufa.y2, t2.lufa.y2);

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
					ctx.fillText(t1.nick + ' [' + t1.kills + '] ', wsp.x, wsp.y - 30);
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
					evt.preventDefault();
					break;
				case 9: // TAB
				case 20: //capslock
					evt.preventDefault();
					game.switch_weapons();
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
	$('#ppm, #lpm').mouseover(game.show_ab_info)
		.mouseout(game.remove_ab_info);
}

var bullets = {
	draw: function() {
		for (var i in game.msg1.bullets) {
			if (game.msg1.bullets[i] && game.msg2.bullets[i]) {
				var x = game.interp(game.msg1.bullets[i].x, game.msg2.bullets[i].x);
				var y = game.interp(game.msg1.bullets[i].y, game.msg2.bullets[i].y);
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