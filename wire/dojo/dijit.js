define(['dojo'], function(dojo) {
	var parsed = false,
		dijits = [],
		dijitsRecursive = [];
	
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
		wire$listeners: {
			onContextInit: function() {
				// Only ever parse the page once, even if other child
				// contexts are created with this plugin present.
				if(!parsed) {
					dojo.parser.parse();
					parsed = true;
				}
			},
			onContextDestroy: function(context) {
				for (var i = dijits.length - 1; i >= 0; i--){
					dijits[i].destroy();
				}
				for (i = dijitsRecursive.length - 1; i >= 0; i--){
					dijitsRecursive[i].destroy();
				}
			},
			onCreate: function(target) {
				if(typeof target.declaredClass == 'string') {
					// Prefer destroyRecursive over destroy
					if(typeof target.destroyRecursive == 'function') {
						dijitsRecursive.push(target);
					} else if(typeof target.destroy == 'function') {
						dijits.push(target);
					}
				}
			}
		}
	};
});