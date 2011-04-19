wire({
	plugins: [
		{ module: 'wire/base' },
		{ module: 'wire/debug' },
		{ module: 'wire/dojo/pubsub' }
	],
	// Create a logger object, in this case an AlertLogger
	logger: {
		create: 'test/test1/AlertLogger'
		// if you want a less noisy test, wire in a ConsoleLogger instead!
		// create: 'test/test1/ConsoleLogger'
	},
	// Create a publisher Thing that will publish a topic when its doSomething
	// method is called
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
	// Create a subscriber Thing whose doSomething method will be called
	// when the topic is published
	thing2: {
		create: "test/pubsub1/Thing",
		properties: {
			name: "Thing 2",
			logger: { $ref: 'logger' }
		},
		subscribe: {
			"thing/did-something": "doSomething"
		},
	}
}).then(
	function(context) {
		// Call doSomething on the publisher Thing.  This will also trigger
		// the subscriber Thing's doSomething!
		context.thing1.doSomething("hello!");
		
		context.destroy();
	}
);