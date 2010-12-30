define(['dojo'], function(dojo) {
	var parsed = false,
		dijits = [],
		dijitsRecursive = [],
		undef;
	
	return {
		wire$resolvers: {
			dijit: function(name, refObj, context) {
				return dijit.byId(name);
			}
		},
		wire$setters: [
			function(object, property, value) {
				if(typeof object.set == 'function') {
					object.set(property, value);
					return true;
				}

				return false;
			}
		],
		wire$onContextInit: function() {
			// Only ever parse the page once, even if other child
			// contexts are created with this plugin present.
			if(!parsed) {
				dojo.parser.parse();
				parsed = true;
			}
		},
		wire$onContextDestroy: function(target) {
			for (var i = dijits.length - 1; i >= 0; i--){
				dijits[i].destroy();
			}
			for (i = dijitsRecursive.length - 1; i >= 0; i--){
				dijitsRecursive[i].destroy();
			}
		},
		wire$onCreate: function(target) {
			if(typeof target.declaredClass == 'string') {
				if(typeof target.destroyRecursive == 'function') {
					dijitsRecursive.push(target);
				} else if(typeof target.destroy == 'function') {
					dijits.push(target);
				}
			}
		}
	};
});