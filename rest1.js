wire({
	wire$plugins: [
		{ module: 'wire/dom' },
		{ module: 'wire/dojo/store' }
	],
	// These two constrollers are equivalent.  The rest! resolver makes life easier.
	controller: {
		module: 'test/rest1/View',
		create: [],
		properties: {
			itemTemplate: { module: 'require/text!test/rest1/person-template1.html' },
			template: { module: 'require/text!test/rest1/container-template1.html' },
			container: { $ref: 'dom!container1' },
			store: { $ref: 'resource!test/rest1/person.json' }
		},
		init: 'ready'
	},
	controller2: {
		module: 'test/rest1/View',
		create: [],
		properties: {
			itemTemplate: { module: 'require/text!test/rest1/person-template2.html' },
			template: { module: 'require/text!test/rest1/container-template2.html' },
			container: { $ref: 'dom!container2' },
			store: {
				module: 'dojo/store/JsonRest',
				create: [{ target: 'test/rest1/person.json' }]
			}
		},
		init: 'ready'
	},
}).then(
	function(context) {
		console.log("Done!", context);
	}
);