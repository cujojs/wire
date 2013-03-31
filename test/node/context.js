(function(buster, context) {
"use strict";

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};

function createContext(spec) {
	return context(spec, null, { require: require });
}

buster.testCase('context', {

	'array of specs': {
		'should be merged': function(done) {
			createContext([{ a: 1 }, { b: 2 }]).then(
				function(context) {
					assert.equals(context.a, 1);
					assert.equals(context.b, 2);
				},
				fail
			).then(done, done);
		},

		'should allow overriding': function(done) {
			createContext([{ a: 1 }, { a: 2 }]).then(
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
			context({}, null, {
				require: require,
				contextHandlers: {
					init: function() { executed = true; }
				}
			}).then(
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
				}).then(function(context) {
					return context.destroy();
				}).then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				).then(done, done);
			},

			'child': {
				'should be destroyed when parent is destroyed': function(done) {
					createContext({ a: 0 }).then(function(parent) {
						return parent.wire({ a: 1 }).then(function(child) {
							return child.wire({ a: 2 }).then(function(grandchild) {

								assert.equals(parent.a, 0);
								assert.equals(child.a, 1);
								assert.equals(grandchild.a, 2);

								return child.destroy().then(function() {
									assert.equals(grandchild.a, 0);
								});

							});
						});
					}).then(done, done);
				}
			}
		}
	}
});

})(
	require('buster'),
	require('../../lib/context')
);