wire({
	wire$plugins: [
		{ module: 'wire/rest' },
		{ module: 'wire/debug' }
	],
	// These two constrollers are equivalent.  The rest! resolver makes life easier.
	controller: {
		module: 'test/rest1/Controller',
		create: [],
		properties: {
			store: { '$ref': 'rest!test/rest1/person.json' }
		},
		init: 'ready'
	},
	controller2: {
		module: 'test/rest1/Controller',
		create: [],
		properties: {
			store: {
				module: 'dojo/store/JsonRest',
				create: [{ target: 'test/rest1/person.json' }]
			}
		},
		init: 'ready'
	}
},
function(context) {
	console.log(context.get('controller'));
	console.log(context.get('controller2'));
});