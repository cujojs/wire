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

	'component lifecycle': {
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
				).then(done, done);
			}
		}
	},

	'context lifecycle': {
		'initialize': {
			'tearDown': function() {
				delete pluginModule.wire$plugin;
			},

			'should occur before component creation': function(done) {
				function createPlugin() {
					return {
						context: {
							initialize: function(resolver) {
								refute.calledOnce(spy);
								resolver.resolve();
							}
						}
					};
				}

				var spy = this.spy();
				createContext({
					plugin: { module: { wire$plugin: createPlugin} },
					a: {
						create: { module: spy }
					}
				}, null, { require: require })
					.otherwise(fail)
					.then(done, done);
			}
		}
	}
});

})(
	require('buster'),
	require('../../lib/context'),
	require('./fixtures/object')
);