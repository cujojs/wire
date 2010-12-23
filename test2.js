wire({
	// There is nothing special about this array.  It's just an array of modules
	// whose only member happens to be a plugin, but we could define it at the top
	// level or at any depth.  So, the following would work just as well:
	// dom: { module: 'wire/dom' }
	// This seems like it could end up being a reasonable convention, tho.
	wire$plugins: [
		{ module: 'dojo' },
		{ module: 'dijit/form/TextBox' },
		{ module: 'wire/dijit' }, // Calls dojo.parser.parse
		{ module: 'wire/dom' }
	],
	// Create a controller, and inject a dijit.form.TextBox that is also
	// created and wired to a dom node here in the spec.
	controller: {
		module: 'test/test2/Controller',
		create: [],
		properties: {
			name: "controller1",
			widget: { 
				module: 'dijit/form/TextBox',
				create: [{}, { $ref: 'dom!widgetNode' }]
			}
		},
		init: {
			ready: []
		}
	},
	// Create a controller, and inject a dijit.form.TextBox that is simply
	// referenced using the dijit resolver
	controller2: {
		module: 'test/test2/Controller',
		create: [],
		properties: {
			name: "controller2",
			widget: { $ref: 'dijit!widget' }
		},
		init: {
			ready: []
		}
	}
},
function(context) {
	console.log(context.get('controller'));
	console.log(context.get('controller2'));
});
