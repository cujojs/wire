(function(buster, wire, debugPlugin) {
'use strict';

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

var log;

buster.testCase('wire/debug', {
	setUp: function() {
		// Silence debug logging
		log = console.log;
		console.log = function() {};
	},

	tearDown: function() {
		// Restore console
		console.log = log;
	},

	'should set constructor on constructor-less object components': function() {
		return wire({
			plugins: [debugPlugin],
			myComponent: {
				create: './test/node/fixtures/object'
			}
		}).then(function(context) {
			assert.isFunction(context.myComponent.constructor);
			assert.equals(context.myComponent.constructor.name, 'myComponent');
		});
	},

	'should set not constructor on components that already have one': function() {
		return wire({
			plugins: [debugPlugin],
			myComponent: {
				create: './test/node/fixtures/constructor'
			}
		}).then(function(context) {
			assert.isFunction(context.myComponent.constructor);
			refute.equals(context.myComponent.constructor.name, 'myComponent');
		});
	},

	'should not set constructor on non-object components': function() {
		return wire({
			plugins: [debugPlugin],
			myComponent: 'just a string'
		}).then(function(context) {
			refute.equals(context.myComponent.constructor.name, 'myComponent');
		});
	},

	'should not set constructor when not active': function() {
		return wire({
			myComponent: {
				create: './test/node/fixtures/object'
			}
		}).then(function(context) {
			refute.equals(context.myComponent.constructor.name, 'myComponent');
		});
	}

});
})(
	require('buster'),
	require('../..'),
	require('../../debug')
);