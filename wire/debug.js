define([], function() {
	var log = console.log;
		
	return {
		wire$setters: [
			function(object, property, value) {
				console.log('Setting property: ', object, property, value);
			}
		],
		wire$afterCreate: function(target, spec, resolver) {
			console.log('After create: ', target, spec, resolver);
		},
		wire$afterProperties: function(target, spec, resolver) {
			console.log('After properties: ', target, spec, resolver);
		},
		wire$afterInit: function(target, spec, resolver) {
			console.log('After init: ', target, spec, resolver);
		}
	};
});