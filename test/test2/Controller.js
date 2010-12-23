define([], function() {

	var Controller = function() {
	};
	
	Controller.prototype.ready = function() {
		if(this.widget) {
			var self = this;
			dojo.connect(this.widget, 'onChange', function(value) {
				console.log(self.name + ": " + value);
			});
		}
	};

	return Controller;
});