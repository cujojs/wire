(function(buster, createContext, pluginModule) {
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

	'destroyers': {
		'should execute when context is destroyed': function(done) {
			var executed = false;
			createContext({}, null, {
				require: require,
				contextHandlers: {
					destroy: function() { executed = true; }
				}
			}).then(
				function(context) {
					refute(executed);

					context.destroy().then(
						function() {
							assert(executed);
						}
					);
				}
			).then(done, done);
		}
	},

	'initializers and destroyers': {
		'should execute in correct order': function(done) {
		var init, destroy;
			createContext({}, null, {
				require: require,
				contextHandlers: {
					init: function() {
						refute(init);
						refute(destroy);
						init = true;
					},
					destroy: function() {
						assert(init);
						refute(destroy);
						destroy = true;
					}
				}
			}).then(
				function(context) {
					// Should not have executed yet
					refute(destroy);

					return context.destroy().then(
						function() {
							assert(destroy);
						}
					);
				}
			).then(done, done);
		}
	},

	'lifecycle': {
		'destroy': {
			'tearDown': function() {
				delete pluginModule.wire$plugin;
			},

			'should propagate errors if component destroy fails': function(done) {
				pluginModule.wire$plugin = function() {
					return { proxies: [proxy] };
				};

				function proxy(p) {
					p.destroy = function() { throw sentinel; };
				}

				createContext({
					a: { literal: { name: 'a' } },
					plugin: { module: './fixtures/object' }
				}, null, { require: require }
				).then(function(context) {
					return context.destroy();
				}).then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				).always(done);
			}
		}
	}
});

})(
	require('buster'),
	require('../../lib/context'),
	require('./fixtures/object')
);