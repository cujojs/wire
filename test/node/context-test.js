(function(buster, context) {
'use strict';

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};

function createContext(spec) {
	return context(spec, null, { require: require });
}

buster.testCase('context', {

	'module loading': {
		'should allow spec-relative module ids': function() {
			return createContext('./fixtures/relativeSpec').then(
				function(context) {
					assert(!!context.component);
				}
			);
		}
	},

	'array of specs': {
		'should be merged': function() {
			return createContext([{ a: 1 }, { b: 2 }]).then(
				function(context) {
					assert.equals(context.a, 1);
					assert.equals(context.b, 2);
				},
				fail
			);
		},

		'should allow overriding': function() {
			return createContext([{ a: 1 }, { a: 2 }]).then(
				function(context) {
					assert.equals(context.a, 2);
				},
				fail
			);
		}
	},

	'initializers': {
		'should execute when context is created': function() {
			var executed = false;
			return context({}, null, {
				require: require,
				initializers: [
					function() { executed = true; }
				]
			}).then(
				function() {
					assert(executed);
				},
				fail
			);
		}
	},

	'events': {
		'error': {
			'should receive error arg': function() {
				var plugin, err;

				plugin = {
					context: {
						error: function(resolver, api, e) {
							err = e;
							resolver.resolve();
						}
					}
				};

				return createContext({
					x: { create: function() { throw sentinel; } },
					$plugins:[function() { return plugin; }]
				}).then(
					fail,
					function() {
						assert.same(err, sentinel);
					}
				);
			}
		},

		'destroying a context': {
			'should trigger shutdown then destroy': function() {
				var plugin, contextShutdown, contextDestroyed;

				plugin = {
					context: {
						shutdown: function(resolver) {
							refute(contextDestroyed);
							contextShutdown = true;
							resolver.resolve();
						},
						destroy: function(resolver) {
							assert(contextShutdown);
							contextDestroyed = true;
							resolver.resolve();
						}
					}
				};

				return createContext({
					a: 123,
					$plugins:[function() { return plugin; }]
				}).then(
					function(context) {
						refute(contextShutdown);
						return context.destroy().then(
							function() {
								assert(contextDestroyed);
							}
						);
					}
				);

			}
		}
	},

	'lifecycle': {
		'destroy': {
			'should propagate errors if component destroy fails': function() {
				function plugin() {
					return { proxies: [proxy] };
				}

				function proxy(p) {
					p.destroy = function() { throw sentinel; };
				}

				return createContext({
					a: { literal: { name: 'a' } },
					plugins: [plugin]
				}).then(function(context) {
					return context.destroy();
				}).then(
					fail,
					function(e) {
						assert.same(e, sentinel);
					}
				);
			},

			'child': {
				'should be destroyed before parent is destroyed': function() {
					return createContext({ a: 0 }).then(function(parent) {
						return parent.wire({ a: 1 }).then(function(child) {
							return child.wire({ a: 2 }).then(function(grandchild) {

								assert.equals(parent.a, 0);
								assert.equals(child.a, 1);
								assert.equals(grandchild.a, 2);

								var childDestroyed = false;
								var origDestroy = grandchild.destroy.bind(grandchild);
								grandchild.destroy = function() {
									refute(childDestroyed);
									assert.equals(grandchild.a, 2);
									return origDestroy();
								};

								return child.destroy().then(function() {
									childDestroyed = true;
									assert.equals(grandchild.a, 0);
								});

							});
						});
					});
				}
			}
		}
	},

	'plugin api': {
		'addInstance': {
			'should add instance by name': function() {
				function plugin() {
					return {
						context: {
							initialize: function(resolver, wire) {
								wire.addInstance(sentinel, 'instance');
								resolver.resolve();
							}
						}
					}
				}

				return createContext({
					plugins: [plugin],
					test: { $ref: 'instance' }
				}).then(
					function(context) {
						assert.same(context.test, sentinel);
					},
					fail
				);
			},

			'should not process instance lifecycle': function() {
				var spy = this.spy(function(resolver) {
					resolver.resolve();
				});

				function plugin() {
					return {
						context: {
							initialize: function(resolver, wire) {
								wire.addInstance(sentinel, 'instance');
								resolver.resolve();
							}
						},
						initialize: spy
					}
				}

				return createContext({
					plugins: [plugin]
				}).then(
					function() {
						refute.called(spy);
					},
					fail
				);
			}
		},

		'addComponent': {
			'should add instance by name': function() {
				function plugin() {
					return {
						context: {
							initialize: function(resolver, wire) {
								wire.addComponent(1, 'instance');
								resolver.resolve();
							}
						}
					}
				}

				return createContext({
					plugins: [plugin],
					test: { $ref: 'instance' }
				}).then(
					function(context) {
						assert.equals(context.test, 1);
					},
					fail
				);
			},

			'should process component lifecycle': function() {
				var spy = this.spy(function(resolver) {
					resolver.resolve();
				});

				function plugin() {
					return {
						context: {
							initialize: function(resolver, wire) {
								wire.addComponent({}, 'instance');
								resolver.resolve();
							}
						},
						initialize: spy
					}
				}

				return createContext({
					plugins: [plugin]
				}).then(
					function() {
						assert.called(spy);
					},
					fail
				);
			}
		}
	}
});

})(
	require('buster'),
	require('../../lib/context')
);