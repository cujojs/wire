define([], function() {

	var me = function() {};
	
	me.prototype.doSomething = function(message) {
		this.logger.log(this.name + ": " + message);
		return message;
	};
	
	return me;
});