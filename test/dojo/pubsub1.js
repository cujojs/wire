define({
	plugins: [
		{ module: 'wire/debug' },
		{ module: 'wire/dojo/pubsub' }
	],
	// Create a logger object, in this case a ConsoleLogger
	logger: {
		create: 'test/test1/ConsoleLogger'
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
			"doSomething": "thing/did-something",
			"doSomethingElse": "thing/did-something-else"
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
			"thing/did-something": "respondToSomething",
			"thing/did-something-else": "respondToSomethingElse"
		}
	}
});