(function(buster, wire) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('refs', {

	'should fail wiring when empty': function() {
		return wire({
			test: { $ref: '' }
		}).then(
			function() { throw new Error('Empty ref did not cause failure'); },
			function() { assert(true); }
		);
	},

	'should fail wiring when target missing': function() {
		return wire({
			thingRef: { $ref: 'thing' }
		}).then(
			function() { throw new Error('Missing ref did not cause failure'); },
			function() { assert(true); }
		);
	},

	'should fail wiring when nested target missing': function() {
		return wire({
			thing: {},
			thingRef: { $ref: 'thing.nested' }
		}).then(
			function() { throw new Error('Missing nested ref did not cause failure'); },
			function() { assert(true); }
		);
	},

	'should fail wiring from plugin when target missing': function() {
		return wire({
			propTest: {
				create: 'test',
				properties: {
					thingProp: { $ref: 'thing' }
				}
			}
		}).then(
			function(context) { throw new Error('Missing ref did not cause failure: ' + context.propTest.thingProp); },
			function() { assert(true); }
		);
	},

	'should fail child wiring when target missing': function() {
		return wire({
			// Parent context with nothing useful
			notTheThing: 123
		}).then(
			function(parent) {
				return parent.wire({
					thingRef: { $ref: 'thing' }
				}).then(
					function() { throw new Error('Missing ref did not cause child wiring failure'); },
					function () { assert(true); }
				);
			}
		);
	}

});

})(
	require('buster'),
	require('../../wire')
);