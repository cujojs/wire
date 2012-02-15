define([], function() {

	var me = function() {};
	
	me.prototype = {
		
		sentSomething: false,
		sentSomethingElse: false,
		respondedToSomething: false,
		respondedToSomethingElse: false,
		
		doSomething: function(message) {
			this.sentSomething = true;
			this.logger.log(this.name + " Publishing something: " + message);
			return message;
		},
		
		doSomethingElse: function(message) {
			this.sentSomethingElse = true;
			this.logger.log(this.name + " Publishing something else: " + message);
			return message;
		},
		
		respondToSomething: function(message) {
			this.respondedToSomething = true;
			this.logger.log(this.name + " Received something: " + message);
			return message;
		},
		
		respondToSomethingElse: function(message) {
			this.respondedToSomethingElse = true;
			this.logger.log(this.name + " Received something else: " + message);
			return message;
		}
	};
	
	return me;
});