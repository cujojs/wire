define(['dojo/store/JsonRest'], function(JsonRest) {
	return {
		wire$resolvers: {
			rest: function(name, refObj, context) {
				// name must be a valid rest url
				return new JsonRest({ target: name });
			}
		}
	};
});