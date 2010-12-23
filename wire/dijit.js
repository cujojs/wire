define(['dojo'], function(dojo) {
	return {
		wire$resolvers: {
			'dijit': function(name, context) {
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
		wire$init: function() {
			dojo.parser.parse();
		}
	};
});