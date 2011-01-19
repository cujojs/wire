define([], function(JsonRest) {
	var undef;
	
	return {
		wire$resolvers: {
			_: function defaultResolver(resolution, name, refObj) {
				// console.log('base trying to resolve', name);
				var resolved = resolution.getObject(name);
				
				if(resolved !== undef) {
					// console.log('base resolved', name);
					resolution.resolve(resolved);
				} else {
					// console.log('base defering resolution', name);
					resolution.objectsCreated.then(function() {
						// console.log('base resolvING later', name)
						var resolved = resolution.getObject(name);
						if(resolved !== undef) {
							// console.log('base resolvED later', name)
							resolution.resolve(resolved);
						} else {
							// console.log('base UNresolved later', name)
							resolution.unresolved();
						}
					});
				}
			}
		},
		wire$setters: [
			function set(object, property, value) {
				object[property] = value;
				return true;
			}
		]
	};
});