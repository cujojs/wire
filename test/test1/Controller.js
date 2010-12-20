define(['test/test1/ConsoleLogger'], function(defaultLogger) {

	var Controller = function(name) {
		// Defaults, these will get rewired
		this.name = name;
		this.number = 1;
		this.logger = defaultLogger;
	};
	
	Controller.prototype.ready = function(message) {
		this.logger.log(this.name + " " + this.number + ": " + message);
	};

	return Controller;
});