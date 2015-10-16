function EventEmitter() {
	this._events = {};
}

EventEmitter.prototype = {
	on: function (eventType, eventHandler) {
		if (!this._events[eventType])
			this._events[eventType] = [];
		if (typeof eventHandler !== 'function')
			console.error('eventHandler must be a function');
		this._events[eventType].push(eventHandler.bind(this));
	}, emit: function (eventType) {
		var events = this._events[eventType]
		if (!events)
			return;
		var args = Array.prototype.slice.call(arguments, 1);
		for (var i = 0; i < events.length; i++) {
			events[i].apply(this, args);
		}
		// this._events[eventType].length = 0;
	}, off: function (eventType, eventHandler) {
		if (typeof this._events[eventType] === 'undefined')
			return;
	
		var index = this._events[eventType].indexOf(eventHandler);
		console.log(eventHandler, this._events);
		if (index === -1)
			return;
	
		return this;
	}
};

module.exports = exports = EventEmitter;