define({
	wire$resolvers: {
		'dom': function(factory, name, refObj, promise) {
			factory.domReady.then(function() {
				var result = document.getElementById(name[0] === '#' ? name.slice(1) : name);
				if(result) {
					promise.resolve(result);
				} else {
					promise.unresolved();
				}
			});
		}
	}
});