(function(buster, functional) {

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('lib/functional', {

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

		'should not change context': function() {
			function f(x) { return this; }

			assert.equals(functional.compose([f]).bind('a')(), 'a');

		}
	},

	'compose.async': {
		'should return a function': function() {
			assert.isFunction(functional.compose.async([function() {}]));
			assert.isFunction(functional.compose.async([function() {}, function() {}]));
			assert.isFunction(functional.compose.async([function() {}], {}));
			assert.isFunction(functional.compose.async([function() {}, function() {}], {}));
		},

		'should return a function that returns a promise for the result': function(done) {
			function f(x) { return x + 'f'; }
			function g(x) { return x + 'g'; }

			var result = functional.compose.async([f, g])('a');

			assert.isFunction(result.then);
			result.then(function(result) {
				assert.equals(result, 'afg');
			}).then(done, done);
		},

		'should not change context': function(done) {
			function f(x) { return this; }

			functional.compose.async([f]).bind('a')().then(function(result) {
				assert.equals(result, 'a');
			}).then(done, done);

		}
	}

});

})(
	require('buster'),
	require('../../../lib/functional.js')
);