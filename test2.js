wire({
	// There is nothing special about this array.  It's just an array of modules
	// whose only member happens to be a plugin, but we could define it at the top
	// level or at any depth.  So, the following would work just as well:
	// dom: { module: 'wire/dom' }
	// This seems like it could end up being a reasonable convention, tho.
	wire$plugins: [
		{ module: 'wire/debug' },
		{ module: 'dijit/form/TextBox' },
		{ module: 'wire/dojo/dijit' }, // Calls dojo.parser.parse
		{ module: 'wire/dom' }
	],
	// Create a controller, and inject a dijit.form.TextBox that is also
	// created and wired to a dom node here in the spec.
	controller: {
		module: 'test/test2/Controller',
		create: [],
		properties: {
			name: { '$ref': 'name' },
			widget: { '$ref': 'widget1' }
		},
		init: 'ready',
		destroy: 'destroy'
	},
	name: 'controller1',
	widget1: { 
		module: 'dijit/form/TextBox',
		create: [{}, { $ref: 'dom!widgetNode' }],
		properties: {
			value: { '$ref': 'initialValue' }
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
		init: 'ready',
		destroy: 'destroy'
	},
	destroyButton: { $ref: 'dom!destroy' }
},
function(context) {
	console.log(context.controller);
	console.log(context.controller2);
	
	// When the button is clicked, cleanup everything by
	// destroying the context
	var d = context.destroyButton;
	d.onclick = function() {
		context.destroy();
		d.onclick = null;
	};
});
