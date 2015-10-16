function SpecialObject(owner, ability, x, y) {
	this.kind = ability.spObject;
	this.x = x;
	this.y = y;
	this.creationTime = Date.now();
	switch (this.kind) {
		// do zmiany 
		case 'darkSpot':
			this.t1 = 500;
			this.t2 = 6000;
			this.t3 = 8000;
			this.r = 0;
			this.op = 1;
			this.maxR = abilities.tarKeg.radius;
			break;
		case 'nukeMark':
			this.t1 = 500;
			break;
		default:
			console.error('Dziwny typ obiektu', this.ind);
	}
}

module.exports = exports = SpecialObject;