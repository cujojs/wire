define(['dojo/store/JsonRest'], function(JsonRest) {
	return {
		wire$resolvers: {
			resource: function(promise, name, refObj, factory) {
				promise.resolve(new JsonRest({ target: name }));
			}
		}
	};
});