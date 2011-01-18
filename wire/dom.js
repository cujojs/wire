define({
	wire$resolvers: {
		'dom': function(resolution, name, refObj) {
			resolution.domReady.then(function() {
				var result = document.getElementById(name[0] === '#' ? name.slice(1) : name);
				if(result) {
					resolution.resolve(result);
				} else {
					resolution.unresolved();
				}
			});
		}
	}
});