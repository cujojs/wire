define([], function() {
	var undef;
	
	return {
		wire$resolvers: {
			_: function defaultResolver(factory, name, refObj, promise) {
				// console.log("++++BASE RESOLVING", name);
				var resolved = factory.resolveName(name);
				
				if(resolved !== undef) {
					// console.log("++++BASE RESOLVED", name);
					promise.resolve(resolved);
				} else {
					factory.refReady(name).then(function() {
						// console.log("++++BASE RESOLVED LATER", name);
						promise.resolve(factory.resolveName(name));
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