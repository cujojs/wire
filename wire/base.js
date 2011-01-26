define([], function() {
	var undef;
	
	return {
		wire$resolvers: {
			_: function defaultResolver(factory, name, refObj, promise) {
				// console.log('base trying to resolve', name);
				var resolved = factory.resolveName(name);
				
				if(resolved !== undef) {
					// console.log('base resolved', name);
					promise.resolve(resolved);
				} else {
					// console.log('base defering resolution', name);
					factory.objectsCreated.then(function() {
						// console.log('base resolvING later', name)
						var resolved = factory.resolveName(name);
						if(resolved !== undef) {
							// console.log('base resolvED later', name)
							promise.resolve(resolved);
						} else {
							// console.log('base UNresolved later', name)
							promise.unresolved();
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