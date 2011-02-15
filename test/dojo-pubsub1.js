wire({
	plugins: [
		{ module: 'wire/debug' },
		{ module: 'wire/dojo/pubsub' }
	],
	logger: {
		create: 'test/test1/AlertLogger'
		// create: 'test/test1/ConsoleLogger' // if you want a less noisy test :)
	},
	thing1: {
		create: "test/pubsub1/Thing",
		properties: {
			name: "Thing 1",
			logger: { $ref: 'logger' }
		},
		publish: {
			"doSomething": "thing/did-something"
		}
	},
	thing2: {
		create: "test/pubsub1/Thing",
		properties: {
			name: "Thing 2",
			logger: { $ref: 'logger' }
		},
		subscribe: {
			"thing/did-something": "doSomething"
		}
	}
}).then(
	function(context) {
		console.log(context);
		context.thing1.doSomething("hello!");
		
		context.destroy();
	}
);