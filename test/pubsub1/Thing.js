define([], function() {

	var me = function(name) {
		this.name = name;
	};
	
	me.prototype = {
		doSomething: function(message) {
			alert(this.name + ": " + message);
			return message;
		}
	};
	
	return me;
});