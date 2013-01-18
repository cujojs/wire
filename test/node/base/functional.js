(function(buster, wire) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

function plusOne(x) {
	return plus(x, 1);
}

function plus(x, y) {
	return x + y;
}

function promisedPlusOne(x) {
	return {
		then: function(f) {
			return promisedPlusOne(f(x+1));
		}
	};
}

function Thing(x) {
	this.x = x;
}

Thing.prototype = {
	f: function(x) {
		return this.x + x;
	}
};

buster.testCase('base:functional', {

	'compose': {
		'should compose array of functions': function(done) {
			wire({
				f1: plusOne,
				f2: plusOne,
				composed: {
					compose: [
						{ $ref: 'f1' },
						{ $ref: 'f2' }
					]
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1), 3);
				}
			).then(done, done);
		},

		'should return a promise when array introduces a promise': function(done) {
			wire({
				f1: plusOne,
				f2: promisedPlusOne,
				f3: plusOne,
				composed: {
					compose: [
						{ $ref: 'f1' },
						{ $ref: 'f2' },
						{ $ref: 'f3' }
					]
				}
			}).then(
				function(c) {
					var result = c.composed(1);
					assert.isFunction(result.then);
					return result.then(function(result) {
						assert.equals(result, 4);
					});
				}
			).then(done, done);
		},

		'should compose a string specification': function(done) {
			wire({
				f1: plusOne,
				f2: plusOne,
				composed: {
					compose: 'f1 | f2'
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1), 3);
				}
			).then(done, done);
		},

		'should return a promise when pipeline introduces a promise': function(done) {
			wire({
				f1: plusOne,
				f2: promisedPlusOne,
				f3: plusOne,
				composed: {
					compose: 'f1 | f2 | f3'
				}
			}).then(
				function(c) {
					var result = c.composed(1);
					assert.isFunction(result.then);
					return result.then(function(result) {
						assert.equals(result, 4);
					});
				}
			).then(done, done);
		},

		'should allow multiple args when composing a string specification': function(done) {
			wire({
				f1: plus,
				f2: plusOne,
				composed: {
					compose: 'f1 | f2'
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1, 2), 4);
				}
			).then(done, done);
		},

		'should compose a string specification with single function': function(done) {
			wire({
				f1: plusOne,
				composed: {
					compose: 'f1'
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1), 2);
				}
			).then(done, done);
		},

		'should compose a string specification with contexts': function(done) {
			wire({
				f1: plusOne,
				t1: { literal: new Thing(1) },
				t2: { literal: new Thing(1) },
				composed: {
					compose: 't1.f | f1 | t2.f'
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1), 4);
				},
				fail
			).then(done, done);
		}

	},

	'invoker': {
		'should wire to a function': function(done) {
			wire({
				i1: {
					invoker: {
						method: 'f', args: []
					}
				}
			}).then(
				function(c) {
					assert.isFunction(c.i1);
				},
				fail
			).then(done, done);
		},

		'should invoke method on target': function(done) {
			var spy, expected;

			spy = this.spy();
			expected = 1;

			wire({
				i1: {
					invoker: {
						method: 'f', args: [expected]
					}
				},
				t1: {
					literal: {},
					properties: {
						f: { literal: spy }
					}
				},
				component: {
					literal: {},
					properties: {
						method: { $ref: 'i1' }
					},
					ready: {
						method: { $ref: 't1' }
					}
				}
			}).then(
				function(c) {
					assert.calledOnceWith(spy, expected);
				},
				fail
			).then(done, done);
		}
	}
});
})(
	require('buster'),
	require('../../../wire')
);