(function(buster, context) {
'use strict';

// TODO: Remove .yield(undefined) where used below
// buster.js seems to have a bug where sometimes returning a
// promise from a test that fulfills with a non-undefined value
// incorrectly causes the test to report an Error.

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

function createContext(spec) {
	return context.call(null, spec, null, { require: require });
}

buster.testCase('lib/plugin/wirePlugin', {
	'wire resolver': {
		'should resolve to a function': function() {
			return createContext({
				_wire: { $ref: 'wire!' }
			}).then(
				function(context) {
					assert.isFunction(context._wire);
				}
			);
		},

		'should allow wiring child contexts': function() {
			return createContext({
				_wire: { $ref: 'wire!' },
				parentProp: true
			}).then(
				function(context) {
					return context._wire({ win: true }).then(function(child) {
						assert(child.win && child.parentProp);
					});
				}
			).otherwise(fail);

		}
	},

	'wire factory': {
		'should create a child context': function() {
			return createContext({
				child: {
					wire:{ spec: { success: true } }
				}
			}).then(
				function(context) {

					var success = !!context.child.success;

					return context.child.destroy().then(
						function() {
							assert(success);
						}
					);

				},
				fail
			);
		},

		'should accept a spec module id': function() {
			return createContext({
				child: {
					wire: '../../fixtures/object'
				}
			}).then(function(context) {
				assert.isFunction(context.wire);
			})
		},

		'provide': {
			'should alias component names into child': function() {
				return createContext({
					child: {
						wire: {
							spec: {
								success: { $ref: 'value' }
							},
							provide: {
								value: true
							}
						}
					}
				}).then(
					function(context) {
						assert(context.child.success);
					},
					fail
				);
			}
		},

		'defer': {
			'should create a function that will wire a child': function() {

				return createContext({
					parent: {
						literal: {},
						properties: {
							child: {
								wire: {
									spec: { success: true },
									defer: true
								}
							}
						}
					}
				}).then(
					function(context) {
						var createChild = context.parent.child;
						return createChild({ mixin: true }).then(function(childContext) {

							assert(childContext.success && childContext.mixin);

							return childContext.destroy();
						}).yield();
					}
				).otherwise(fail);
			},

			'should resolve refs from defer mixin': function() {

				var child = {
					childThing: { $ref: 'objectFromParent' }
				};

				var parent = {
					thing: {
						wire: {
							defer: true,
							spec: child
						}
					}
				};

				return createContext(parent).then(
					function(context) {
						var mixin = { objectFromParent: { success: true }};
						return context.thing(mixin).then(
							function(child) {
								assert(child.hasOwnProperty('objectFromParent'));
								assert(child.objectFromParent);
								assert(child.childThing.success);
							}
						);
					},
					fail
				);
			}
		},

		'nesting': {
			'should be sane': function() {
				var initCalled = 0;
				return createContext({
					outer: {
						wire: {
							spec: {
								test: {
									literal: {
										init: function() {
											initCalled++;
										}
									},
									init: 'init'
								}
							}
						}
					}
				}).then(function() {
					assert.equals(initCalled, 1);
				});
			}
		},

		'$exports': {
			'should export only the value of $exports': function() {
				return createContext({
					success: {
						wire: {
							spec: {
								$exports: { $ref: 'value' },
								value: true
							}
						}
					}
				}).then(
					function (context) {
						assert(context.success);
					},
					fail
				);
			}
		},

		'waitParent': {
			'should wait for parent to finish before wiring child': function() {
				return createContext({
					child: {
						wire: { spec: { success: true }, waitParent: true }
					}
				}).then(
					function(context) {
						assert.isFunction(context.child.promise.then);

						return context.child.promise.then(function(childContext) {
							assert(childContext.success);

							return childContext.destroy();
						}).yield();
					}
				).otherwise(fail);
			},

			'should wait for parent even when nested': function() {
				return createContext({
					parent: {
						literal: {},
						properties: {
							child: {
								wire: { spec: { success: true }, waitParent: true }
							}
						}
					}
				}).then(
					function(context) {
						assert.isFunction(context.parent.child.promise.then);

						return context.parent.child.promise.then(function(childContext) {
							assert(childContext.success);

							return childContext.destroy();
						}).yield();
					}
				).otherwise(fail);
			}
		}
	}
});
})(
	require('buster'),
	require('../../../../lib/context')
);