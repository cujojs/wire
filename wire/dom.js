define({
	wire$resolvers: {
		'dom': function(name, refObj, context) {
			return document.getElementById(name[0] === '#' ? name.slice(1) : name);
		}
	}
});