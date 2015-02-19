module.exports = {
	list: {},
	proto: function(id, pos) {
		this.x = (pos % map.width) * map.tilewidth + map.tilewidth / 2;
		this.y = (pos - pos % map.width) / map.width * map.tileheight + map.tileheight / 2;
		this.speed = Math.floor(300 / speed);
		this.dirX = 0;
		this.dirY = 0;
		this.radius = 22;
		this.r = 22;
		this.lufa = {
			x1: this.x + 5,
			y1: this.y,
			x2: this.x + 15,
			y2: this.y
		};
		this.id = id;
		this.life = 100;
		this.mx = 0;
		this.my = 0;
		this.posX = 0;
		this.posY = 0;
		this.shot = 100;
		this.nuke = 3;
		this.kills = players[id].kills;
		this.deaths = players[id].deaths;
		this.Vx = 0;
		this.Vy = 0;
	},
	ab: function(id, ability) {
		if (tank.list[id][ability] > 0) {
			var t = tank.list[id];
			switch (ability) {
				case 'shot':
					bullets.create(id);
					tank.list[id].shot--;
					game.sounds.push(ability);
					break;
				case 'nuke':
					t.nuke--;
					setTimeout(function(t, mx, my, id) {
						var tile = map.get_id(mx, my);
						if (map.layers[1].data[tile] == 1) {
							map.layers[1].data[tile] = 0; // usuwa box
							map.changes.push([tile, 0]);
						}
						for (var i in tank.list) {
							var t2 = tank.list[i];
							if (col.circle(t2.x - mx, t2.y - my, 64)) { // 64 - AoE radius
								t2.life -= 25;
								if (t2.life <= 0) {
									delete tank.list[i];
									if (t != t2) {
										t.kills++;
										players[id].kills++;
										players[i].deaths++;
									}
								}
							}
						}
						game.sounds.push(ability);
						game.animations.push({
							ab: ability,
							x: mx,
							y: my
						});
					}, 500, t, t.mx, t.my, id);
					break;
			}

		}
	},
	create: function(id) {
		var position;
		do {
			position = losuj(0, map.width * map.height);
		} while (map.layers[1].data[position] != 0)
		tank.list[id] = new tank.proto(id, position);
	},
	move: function() {
		for (var id in this.list) {
			var t = this.list[id];
			var r = t.radius;
			var x = t.x;
			var y = t.y;

			var speed = t.speed;

			//if(map.layers[0].data[map.get_id(x, y)] != 0) speed /= 1.3;

			var dx = t.dirX;
			var dy = t.dirY;

			var old = {
				x: t.x,
				y: t.y
			};

			if (dx != 0 && dy != 0) speed = Math.round(speed / 1.4);

			x += dx * speed;
			y += dy * speed;

			// Kolizje ze ścianami
			if (x < r) {
				x = r;
			} else if (x > board.WIDTH - r) {
				x = board.WIDTH - r;
			}
			if (y < r) {
				y = r;
			} else if (y > board.HEIGHT - r) {
				y = board.HEIGHT - r;
			}

			// Kolizje z boksami

			var d = map.layers[1].data;

			// Działa tylko dla dużych boksów
			var x1 = Math.floor((x + r) / map.tilewidth);
			var y1 = Math.floor((y + r) / map.tileheight);
			var x2 = Math.floor((x - r) / map.tilewidth);
			var y2 = Math.floor((y - r) / map.tileheight);

			var otoczenie = [
				[x1, y1],
				[x1, y2],
				[x2, y1],
				[x2, y2],
			];

			var b = {};

			for (var i = 0; i < otoczenie.length; i++) {
				var tc = d[otoczenie[i][0] + otoczenie[i][1] * map.width]; // tile content
				if (tc != 0) {
					b.x = otoczenie[i][0];
					b.y = otoczenie[i][1];
					b.x1 = b.x * map.tilewidth;
					b.y1 = b.y * map.tileheight;
					b.x2 = b.x * map.tilewidth + map.tilewidth;
					b.y2 = b.y * map.tileheight + map.tileheight;

					if (b.x1 < x + r && b.x2 > x - r && b.y1 < y + r && b.y2 > y - r) {
						var tile = otoczenie[i][0] + otoczenie[i][1] * map.width
						if (tc == 1) { // box
							if (dx == -1) {
								if (Math.abs(b.x2 - (x - r)) <= Math.abs(dx * speed)) { // kolizja z prawym bokiem boxu
									x = b.x2 + r;
								}
							} else if (dx == 1) {
								if (Math.abs(b.x1 - (x + r)) <= Math.abs(dx * speed)) { // kolizja z lewym bokiem boxu
									x = b.x1 - r;
								}
							}
							if (dy == -1) {
								if (Math.abs(b.y2 - (y - r)) <= Math.abs(dy * speed)) { // kolizja z prawym bokiem boxu
									y = b.y2 + r;
								}
							} else if (dy == 1) {
								if (Math.abs(b.y1 - (y + r)) <= Math.abs(dy * speed)) { // kolizja z lewym bokiem boxu
									y = b.y1 - r;
								}
							}
						} else if (tc == 2) { // ammo 
							d[tile] = 0;
							t.shot += 10;
							map.changes.push([tile, 0]);
						} else if (tc == 3) { // nuke
							d[tile] = 0;
							t.nuke += 3;
							map.changes.push([tile, 0]);
						} else if (tc == 4) { // hp
							if (t.life < 100) {
								t.life = Math.min(100, t.life + 30);
								d[tile] = 0;
								map.changes.push([tile, 0]);
							}
						}
					}
				}
			}

			t.x = x;
			t.y = y;

			t.mx = t.mPosX + x - players[id].SCREEN_WIDTH / 2;
			t.my = t.mPosY + y - players[id].SCREEN_HEIGHT / 2;


			var v = new vector(t.mx - t.x, t.my - t.y);
			t.lufa = {
				x1: t.x + v.unit.x * 8,
				y1: t.y + v.unit.y * 8,
				x2: t.x + v.unit.x * 30,
				y2: t.y + v.unit.y * 30
			};
		}
	}
}