(function(buster, context) {
"use strict";

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};

function createContext(spec) {
	return context.call(null, spec, null, { require: require });
}

//function Thing(val) {
//	this.val = val;
//}
//
//Thing.prototype = {
//	go: function() { throw new Error('failed') }
//};

//var parentSpec = {
//	parent: {
//		create: 'Thing',
//		properties: {
//			child: { wire: { spec: 'child' } }
//		}
//	}
//};

//define('parent', parentSpec);
//define('parent-with-direct-child', {
//	child: { wire: { spec: 'child' } }
//});
//
//define('child-expects', {
//	success: { $ref: 'value' },
//	value: false
//});
//
//define('child-exports', {
//	$exports: { $ref: 'value' },
//	value: true
//});
//
//define('child', {
////			debug: { module: 'wire/debug' },
//	success: true
//});
//
//define('child-component', {
////			debug: { module: 'wire/debug' },
//	thing: {
//		create: 'Thing',
//		properties: {
//			success: false
//		}
//	}
//});
//
//define('defer2-parent', {
////			debug: { module: 'wire/debug' },
//	thing: {
//		create: 'Thing',
//		properties: {
//			defer: {
//				wire: {
//					spec: 'defer2-child',
//					defer: true
//				}
//			}
//		}
//	}
//});
//
//define('defer2-child', {
////			debug: { module: 'wire/debug' },
//	childThing: {
//		create: {
//			module: 'Thing',
//			args: [
//				{ $ref: 'objectFromParent' }
//			]
//		},
//		properties: {}
//	}
//});


buster.testCase('lib/plugin/wirePlugin', {
	'wire factory': {
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
		}
	}
});
//require(['wire'], function(wire) {
//
//	function fail(dohd) {
//		return function(err) {
//			dohd.errback(err);
//		}
//	}
//
//	doh.register('wire-factory works', [
//		function shouldResolveRefsFromDeferMixin(doh) {
//			var dohd = new doh.Deferred();
//
//			wire('defer2-parent').then(
//				function(context) {
//					context.thing.defer({ objectFromParent: { success: true }}).then(
//						function(child) {
//							dohd.callback(child.childThing.val.success === true);
//						},
//						fail(dohd)
//					);
//				},
//				fail(dohd)
//			);
//
//			return dohd;
//		},
//		function wireChildImmediate(doh) {
//
//			var dohd = new doh.Deferred();
//
//			wire({
//				child: { wire: { spec: 'child' } }
//			}).then(
//				function(context) {
//
//					var success = !!context.child.success;
//
//					context.child.destroy().then(
//						function() {
//							dohd.callback(success);
//						},
//						fail(dohd)
//					);
//
//				},
//				fail(dohd)
//			);
//
//			return dohd;
//
//		},
//		function wireChildWithProvides(doh) {
//
//			var dohd = new doh.Deferred();
//
//			wire({
//				value: true,
//				child: {
//					wire: {
//						spec: 'child-expects',
//						provide: {
//							success: { $ref: 'value' }
//						}
//					}
//				}
//			}).then(
//				function(context) {
//					dohd.callback(context.child.success);
//				},
//				fail(dohd)
//			);
//
//			return dohd;
//
//		},
//		function wireChildWithExports(doh) {
//
//			var dohd = new doh.Deferred();
//
//			wire({
//				success: {
//					wire: {
//						spec: 'child-exports'
//					}
//				}
//			}).then(
//				function(context) {
//					dohd.callback(context.success === true);
//				},
//				fail(dohd)
//			);
//
//			return dohd;
//
//		},
//		function wireChildImmediateNested(doh) {
//
//			var dohd = new doh.Deferred();
//
//			wire('parent').then(
//				function(context) {
//					dohd.callback(context.parent.child.success);
//				},
//				fail(dohd)
//			);
//
//			return dohd;
//
//		},
//		function wireChildAfter(doh) {
//
//			var dohd = new doh.Deferred();
//
//			wire({
//				child: { wire: { spec: 'child', waitParent: true } }
//			}).then(
//				function(context) {
//
//					var success = typeof context.child.then == 'function';
//					context.child.then(function(childContext) {
//						success = success && !!childContext.success;
//
//						childContext.destroy().then(
//							function() {
//								dohd.callback(success);
//							},
//							fail(dohd)
//						);
//					});
//				},
//				fail(dohd)
//			);
//
//			return dohd;
//
//		},
//		function wireChildAfterPluginApi(doh) {
//
//			var dohd = new doh.Deferred();
//
//			wire({
////						debug: { module: 'wire/debug', verbose: true, filter: 'child' },
//				parent: {
//					create: 'Thing',
//					properties: {
//						child: { wire: { spec: 'child', waitParent: true } }
//					}
//				}
//			}).then(
//				function(context) {
//
//					var success = typeof context.parent.child.value.then == 'function';
//
//					context.parent.child.value.then(function(childContext) {
//						success = success && !!childContext.success;
//
//						childContext.destroy().then(
//							function() {
//								dohd.callback(success);
//							},
//							fail(dohd)
//						);
//					});
//				},
//				fail(dohd)
//			);
//
//			return dohd;
//
//		},
//		function wireChildDeferred(doh) {
//
//			var dohd = new doh.Deferred();
//
//			// Defer the child wiring
//			// Child will be a function
//			parentSpec.parent.properties.child.wire.defer = true;
//
//			wire('parent').then(
//				function(context) {
//
//					context.parent.child({ mixin: true }).then(function(childContext) {
//						var success = childContext.success && childContext.mixin;
//
//						childContext.destroy().then(
//							function() {
//								dohd.callback(success);
//							},
//							fail(dohd)
//						);
//					});
//
//				},
//				fail(dohd)
//			);
//
//			return dohd;
//		}
//	]);
//
//	doh.run();
//
//});
})(
	require('buster'),
	require('../../../../lib/context')
);