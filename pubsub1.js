wire({
	wire$plugins: [
		{ module: 'wire/dom' },
		{ module: 'wire/dojo/pubsub' }
	],
	thing1: {
		create: "test/pubsub1/Thing",
		properties: {
			name: "Thing 1"
		},
		publish: {
			"doSomething": "thing/did-something"
		}
	},
	thing2: {
		create: "test/pubsub1/Thing",
		properties: {
			name: "Thing 2"
		},
		subscribe: {
			"thing/did-something": "doSomething"
		}
	}
}).then(
	function(context) {
		context.thing1.doSomething("hello!");
	}
);