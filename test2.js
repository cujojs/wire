wire({
	// There is nothing special about this array.  It's just an array of modules
	// whose only member happens to be a plugin, but we could define it at the top
	// level or at any depth.  So, the following would work just as well:
	// dom: { module: 'wire/dom' }
	// This seems like it could end up being a reasonable convention, tho.
	plugins: [
		{ module: 'wire/debug' },
		{ module: 'dijit/form/TextBox' },
		{ module: 'wire/dojo/dijit' }, // Calls dojo.parser.parse
		{ module: 'wire/dom' }
	],
	// Create a controller, and inject a dijit.form.TextBox that is also
	// created and wired to a dom node here in the spec.
	controller: {
		create: 'test/test2/Controller',
		properties: {
			name: { '$ref': 'name' },
			widget: { '$ref': 'widget1' }
		},
		init: 'ready',
		destroy: 'destroy'
	},
	name: 'controller1',
	widget1: { 
		create: {
			module: 'dijit/form/TextBox',
			args: {}
		},
		properties: {
			value: { '$ref': 'initialValue' }
		},
		init: {
			placeAt: [{ $ref: 'dom!container' }, 'first']
		}
	},
	// Create a controller, and inject a dijit.form.TextBox that is simply
	// referenced using the dijit resolver
	controller2: {
		create: 'test/test2/Controller',
		properties: {
			name: "controller2",
			widget: { $ref: 'dijit!widget' }
		},
		init: 'ready',
		destroy: 'destroy'
	},
	destroyButton: { $ref: 'dom!destroy' }
}).then(
function(context) {
	console.log("Done!",context);
	
	// When the button is clicked, cleanup everything by
	// destroying the context
	var d = context.destroyButton;
	d.onclick = function() {
		context.destroy();
		d.onclick = null;
	};
},
function(err) {
	console.log("wire failed", err);
});
