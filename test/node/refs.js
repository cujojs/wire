(function(buster, wire) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('refs', {

	'should have visibility to enclosing scope': function() {
		return wire({
			x: 1,
			nest: {
				y: { $ref: 'x' }
			}
		}).then(
			function(context) {
				assert.equals(context.nest.y, 1);
			},
			function() { throw new Error('child should have resolved parent ref'); }
		);
	},

	'should have visibility to enclosing scope when shadowed': function() {
		return wire({
			x: 1,
			nest: {
				x: { $ref: 'x' }
			}
		}).then(
			function(context) {
				assert(context.nest.hasOwnProperty('x'));
				assert.equals(context.nest.x, 1);
			},
			function() { throw new Error('child should have resolved parent ref'); }
		);
	},

	'should have visibility to parent': function() {
		return wire({
			testInParent: 1
		}).then(function(context) {
				return context.wire({
					test: { $ref: 'testInParent' }
				});
			}).then(
			function(child) {
				assert.equals(child.test, 1);
			},
			function() { throw new Error('child should have resolved parent ref'); }
		);
	},

	'should have visibility to parent when shadowed': function() {
		return wire({
			test: 1
		}).then(function(context) {
			return context.wire({
				test: { $ref: 'test' }
			});
		}).then(
			function(child) {
				assert(child.hasOwnProperty('test'));
				assert.equals(child.test, 1);
			},
			function() { throw new Error('child should have resolved parent ref'); }
		);
	},

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
	},

	'should resolve': function() {
		return wire({
			a: true,
			success: { $ref: 'a' }
		}).then(
			function(context) {
				assert(context.success);
			},
			fail
		);
	},

	'should resolve from plugin': function() {
		return wire({
			a: true,
			thing: {
				literal: {},
				properties: {
					success: { $ref: 'a' }
				}
			}
		}).then(
			function(context) {
				assert(context.thing.success);
			},
			fail
		);
	},

	'should allow 1 level of dot traversal for nested references': function() {
		return wire({
			a: { b: true },
			success: { $ref: 'a.b' }
		}).then(
			function(context) {
				assert(context.success);
			},
			fail
		);
	},

	'should not allow > 1 level of dot traversal': function() {
		return wire({
			a: { b: { c: true } },
			success: { $ref: 'a.b.c' }
		}).then(
			fail,
			function() { assert(true); }
		);
	}

});

})(
	require('buster'),
	require('../../wire')
);