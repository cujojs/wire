define(['dojo/store/JsonRest'], function(JsonRest) {
	return {
		wire$resolvers: {
			_: function(promise, name, refObj, factory) {
				factory.modulesLoaded.then(function() {
					promise.resolve(factory.context[name]);
				});
			}
		},
		wire$setters: [
			function set(object, property, value) {
				object[property] = value;
			}
		]
	};
});