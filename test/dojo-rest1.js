wire({
	wire$plugins: [
		{ module: 'wire/debug' },
		{ module: 'wire/dom' },
		{ module: 'wire/dojo/store' }
	],
	// These two constrollers are equivalent.  The resource! resolver makes life easier.
	controller: {
		create: 'test/rest1/View',
		properties: {
			itemTemplate: { module: 'require/text!test/rest1/person-template1.html' },
			template: { module: 'require/text!test/rest1/container-template1.html' },
			container: { $ref: 'dom!container1' },
			store: { $ref: 'resource!rest1/person.json' }
		},
		init: 'ready'
	},
	controller2: {
		create: 'test/rest1/View',
		properties: {
			itemTemplate: { module: 'require/text!test/rest1/person-template2.html' },
			template: { module: 'require/text!test/rest1/container-template2.html' },
			container: { $ref: 'dom!container2' },
			store: {
				create: {
					module: 'dojo/store/JsonRest',
					args: { target: 'rest1/person.json' }
				}
			}
		},
		init: 'ready'
	}
}).then(
	function(context) {
		console.log("Done!", context);
	}
);