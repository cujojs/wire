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

		'should bind arguments': function() {
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

	'partial': {
		'should return a function': function() {
			assert.isFunction(functional.partial(function() {}));
			assert.isFunction(functional.partial(function() {}, 1));
		},

		'should bind arguments': function() {
			function f(a, b) {
				assert.equals(a, 1);
				assert.equals(b, 2);
			}

			functional.partial(f, 1)(2);
		}
	},

	'compose': {
		'should return a function': function() {
			assert.isFunction(functional.compose([function() {}]));
			assert.isFunction(functional.compose([function() {}, function() {}]));
			assert.isFunction(functional.compose([function() {}], {}));
			assert.isFunction(functional.compose([function() {}, function() {}], {}));
		},

		'should invoke originals left to right': function() {
			function f(x) { return x + 'f'; }
			function g(x) { return x + 'g'; }

			assert.equals(functional.compose([f, g])('a'), 'afg');
		},

		'should bind context': function() {
			function f(x) { return x + this; }

			assert.equals(functional.compose([f, f], 'b')('a'), 'abb');
		}

	}

});

})(
	require('buster'),
	require('../../../lib/functional.js')
);