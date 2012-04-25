(function(buster, functional) {

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('lib/functional', {

	'bind': {
		'should bind context': function() {
			var context = {};

			function f() {
				assert.same(this, context);
			}

			functional.bind(f, context)();
		},

		'should bind arguments right-aligned': function() {
			function f(a, b) {
				assert.equals(a, 1);
				assert.equals(b, 2);
			}

			functional.bind(f, null, 1)(2);
		},

		'should bind context and arguments': function() {
			var context = {};

			function f(a, b) {
				assert.same(this, context);
				assert.equals(a, 1);
				assert.equals(b, 2);
			}

			functional.bind(f, context, 1)(2);
		}

	},

	'bindRight': {
		'should bind context': function() {
			var context = {};

			function f() {
				assert.same(this, context);
			}

			functional.bindRight(f, context)();
		},

		'should bind arguments right-aligned': function() {
			function f(a, b) {
				assert.equals(a, 2);
				assert.equals(b, 1);
			}

			functional.bindRight(f, null, 1)(2);
		},

		'should bind context and arguments': function() {
			var context = {};

			function f(a, b) {
				assert.same(this, context);
				assert.equals(a, 2);
				assert.equals(b, 1);
			}

			functional.bindRight(f, context, 1)(2);
		}

	}

});

})(
	require('buster'),
	require('../../../lib/functional.js')
);