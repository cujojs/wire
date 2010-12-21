define({
	wire$resolvers: {
		'dom': function(name, context) {
			return document.getElementById(name[0] === '#' ? name.slice(1) : name);
		}
	},
});