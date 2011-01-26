define(['dojo/store/JsonRest'], function(JsonRest) {
	return {
		wire$resolvers: {
			resource: function(factory, name, refObj, promise) {
				promise.resolve(new JsonRest({ target: name }));
			}
		}
	};
});