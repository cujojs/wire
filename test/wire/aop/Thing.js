define([], function() {

	var me = function() {};
	
	me.prototype.doSomething = function(message) {
		console.log(this.name + ": " + message);
		return message;
	};
	
	return me;
});