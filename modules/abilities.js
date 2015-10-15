 var abilities = {
	nuke: {
		id: 1,
		dmg: 25,
		latency: 500,
		AoE: true,
		radius: 64,
		spObject: 'nukeMark',
		startAmount: 2
	},
	shot: {
		id: 0,
		dmg: 10,
		bullets: true,
		startAmount: 60
	},
	tarKeg: {
		id: 2,
		AoE: true,
		radius: 100,
		spObject: 'darkSpot', // do zmiany na obiekt
		startAmount: 2
	}
}

module.exports = exports = abilities;