(function(buster, createContext) {
"use strict";

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};

buster.testCase('context', {

	'array of specs': {
		'should be merged': function(done) {
			createContext([{ a: 1 }, { b: 2 }], null, { require: require }).then(
				function(context) {
					assert.equals(context.a, 1);
					assert.equals(context.b, 2);
				},
				fail
			).then(done, done);
		},

		'should allow overriding': function(done) {
			createContext([{ a: 1 }, { a: 2 }], null, { require: require }).then(
				function(context) {
					assert.equals(context.a, 2);
				},
				fail
			).then(done, done);

		}
	},

	'initializers': {
		'should execute when context is created': function(done) {
			var executed = false;
			var context = createContext({}, null, {
				require: require,
				contextHandlers: {
					init: function() { executed = true; }
				}
			});
			context.then(
				function() {
					assert(executed);
				},
				fail
			).then(done, done);
		}
	},

	'lifecycle': {
		'destroy': {
			'should propagate errors if component destroy fails': function(done) {
				function plugin() {
					return { proxies: [proxy] };
				}

				function proxy(p) {
					p.destroy = function() { throw sentinel; };
				}

				createContext({
					a: { literal: { name: 'a' } },
					plugins: [plugin]
				}, null, { require: require }
				).then(function(context) {
					return context.destroy();
				}).then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				).then(done, done);
			}
		}
	}
});

})(
	require('buster'),
	require('../../lib/context')
);