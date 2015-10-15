 var abilities = {
	nuke: {
		id: 1,
		base_dmg: 25,
		latency: 500,
		AoE: true,
		baseRadius: 64,
		spObject: 'nukeMark',
		start_amount: 2
	},
	shot: {
		id: 0,
		base_dmg: 10,
		bullets: true,
		startAmount: 60
	},
	tarKeg: {
		id: 2,
		AoE: true,
		base_radius: 100,
		spObject: 'darkSpot', // do zmiany na obiekt
		startAmount: 2
	}
}

module.exports = exports= abilities;