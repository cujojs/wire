define([], function() {

	var Controller = function() {
	};
	
	Controller.prototype.ready = function() {
		this.store.query({}).forEach(function(person) {
			console.log(person);
		});
	};

	return Controller;
});