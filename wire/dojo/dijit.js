define(['dojo'], function(dojo) {
	var parsed = false,
		destroyFuncs = [];
	
	return {
		wire$resolvers: {
			dijit: function(factory, name, refObj, promise) {
				dojo.ready(
					function() {
						var resolved = dijit.byId(name);
						if(resolved) {
							promise.resolve(resolved);
						} else {
							promise.unresolved();
						}
					}
				);
			}
		},
		wire$setters: [
			function setDijitProperty(object, property, value) {
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
					parsed = true;
					dojo.ready(function() { dojo.parser.parse(); });
				}
			},
			onContextDestroy: function(context) {
				for (var i = 0; i < destroyFuncs.length; i++){
					destroyFuncs[i]();
				}
			},
			onCreate: function(target) {
				if(typeof target.declaredClass == 'string') {
					// Prefer destroyRecursive over destroy
					if(typeof target.destroyRecursive == 'function') {
						destroyFuncs.push(function destroyDijit() {
							target.destroyRecursive();
						});
					} else if(typeof target.destroy == 'function') {
						destroyFuncs.push(function destroyDijit() {
							target.destroy();
						});
					}
				}
			}
		}
	};
});