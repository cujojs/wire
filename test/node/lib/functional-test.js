(function(buster, functional) {

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

function promised(val) {
	return {
		then: function(f) {
			return promised(f(val));
		}
	};
}

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

		'should not change context': function() {
			function f() { return this; }

			var context = {};

			assert.equals(functional.compose([f]).bind(context)(), context);

		},

		'should not change context when returning a promise': function(done) {
			function f() { return promised(this); }

			var context = {};

			functional.compose([f]).bind(context)().then(function(result) {
				assert.equals(result, context);
			}).then(done, done);

		},

		'should invoke originals left to right': function() {
			function f(x) { return x + 'f'; }
			function g(x) { return x + 'g'; }

			assert.equals(functional.compose([f, g])('a'), 'afg');
		},

		'should return a promise when any composed function introduces a promise': function(done) {
			function f(x) { return x + 'f'; }
			function g(x) { return promised(x + 'g'); }
			function h(x) { return x + 'h'; }

			var result = functional.compose([f, g, h])('a');

			assert.isFunction(result.then);
			result.then(function(result) {
				assert.equals(result, 'afgh');
			}).then(done, done);
		}
	}

});

})(
	require('buster'),
	require('../../../lib/functional.js')
);