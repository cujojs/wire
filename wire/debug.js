define([], function() {
	var log = console.log;
	
	return {
		wire$setters: [
			function(object, property, value) {
				console.log('Setting property: ', object, property, value);
			}
		],
		// Overall context lifecycle callbacks
		wire$onContextInit: function(modules, moduleNames) {
			log("Context init: ", moduleNames, modules);
		},
		wire$onContextReady: function(context) {
			log("Context ready: ", context);
		},
		// Individual object lifecycle callbacks
		wire$afterCreate: function(target, spec, resolver) {
			log('After create: ', target, spec, resolver);
		},
		wire$afterProperties: function(target, spec, resolver) {
			log('After properties: ', target, spec, resolver);
		},
		wire$afterInit: function(target, spec, resolver) {
			log('After init: ', target, spec, resolver);
		}
	};
});