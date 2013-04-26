(function(buster, context) {
'use strict';

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

function createContext(spec) {
	return context.call(null, spec, null, { require: require });
}

buster.testCase('lib/plugin/wirePlugin', {
	'wire resolver': {
		'should resolve to a function': function(done) {
			createContext({
				_wire: { $ref: 'wire!' }
			}).then(
				function(context) {
					assert.isFunction(context._wire);
				}
			).then(done, done);
		},

		'should allow wiring child contexts': function(done) {
			createContext({
				_wire: { $ref: 'wire!' },
				parentProp: true
			}).then(
				function(context) {
					return context._wire({ win: true }).then(function(child) {
						assert(child.win && child.parentProp);
					});
				}
			).otherwise(fail).then(done, done);

		}
	},

	'wire factory': {
		'should create a child context': function(done) {
			createContext({
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
			).then(done, done);
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
			'should alias component names into child': function(done) {
				createContext({
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
				).then(done, done);
			}
		},

		'defer': {
			'should create a function that will wire a child': function(done) {

				createContext({
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
						});
					}
				).otherwise(fail).then(done, done);
			},

			'should resolve refs from defer mixin': function(done) {

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

				createContext(parent).then(
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
				).then(done, done);
			}
		},

		'$exports': {
			'should export only the value of $exports': function(done) {
				createContext({
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
				).then(done, done);
			}
		},

		'waitParent': {
			'should wait for parent to finish before wiring child': function(done) {
				createContext({
					child: {
						wire: { spec: { success: true }, waitParent: true }
					}
				}).then(
					function(context) {
						assert.isFunction(context.child.promise.then);

						return context.child.promise.then(function(childContext) {
							assert(childContext.success);

							return childContext.destroy();
						});
					}
				).otherwise(fail).then(done, done);
			},

			'should wait for parent even when nested': function(done) {
				createContext({
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

						context.parent.child.promise.then(function(childContext) {
							assert(childContext.success);

							return childContext.destroy();
						});
					}
				).otherwise(fail).then(done, done);
			}
		}
	}
});
})(
	require('buster'),
	require('../../../../lib/context')
);