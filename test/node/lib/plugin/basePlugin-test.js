(function(buster, context) {
'use strict';

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};

function createContext(spec) {
	return context.call(null, spec, null, { require: require });
}

function Constructor(value) {
	this.value = value;
}

Constructor.prototype = {
	foo: function() {}
};

function plusOne(x) {
	return plus(x, 1);
}

function plus(x, y) {
	return x + y;
}

function promisedPlusOne(x) {
	return {
		then: function(f) {
			return promisedPlusOne(f(x+1));
		}
	};
}

function Thing(x) {
	this.x = x;
}

Thing.prototype = {
	f: function(x) {
		return this.x + x;
	}
};

buster.testCase('lib/plugin/basePlugin', {
	'module factory': {
		'should use module exports value as component': function(done) {
			createContext({
				test: {
					module: '../../fixtures/module'
				}
			}).then(
				function(context) {
					assert(context.test.success);
				},
				fail
			).then(done, done);
		}
	},

	'literal factory': {
		'should use value verbatim': function(done) {
			createContext({
				test: {
					literal: { module: 'fake' }
				}
			}).then(
				function(context) {
					assert.equals(context.test.module, 'fake')
				},
				fail
			).then(done, done);
		},

		'should not resolve references': function(done) {
			createContext({
				test: {
					literal: { x: { $ref: 'fake' } }
				}
			}).then(
				function(context) {
					assert.equals(context.test.x.$ref, 'fake')
				},
				fail
			).then(done, done);
		}
	},

	'clone factory': {
		'should return same type of object': function(done) {
			createContext({
				object: { literal: {} },
				array: { literal : [] },
				date: { literal: new Date('12/01/2007') },
				regexp: { literal: /foo/i },
				obj1: {
					clone: { $ref: 'object' }
				},
				array1: {
					clone: { $ref: 'array' }
				},
				date1: {
					clone: { $ref: 'date' }
				},
				rx1: {
					clone: { $ref: 'regexp' }
				}
			}).then(
				function (context) {
					assert.equals(({}).toString.call(context.obj1), '[object Object]');
					assert.isArray(context.array1);
					assert.equals(({}).toString.call(context.date1), '[object Date]');
					assert.equals(({}).toString.call(context.rx1), '[object RegExp]');
				},
				fail
			).then(done, done);
		},

		'should make copies of deep objects when deep == true': function(done) {
			// TODO
			createContext({
				orig: {
					literal: {
						foo: {
							bar: {
								prop: 42
							}
						}
					}
				},
//				obj2: { clone: { $ref: 'orig' } },
				obj1: {
					clone: { source: { $ref: 'orig'}, deep: true }
				},
				arr: {
					literal: [
						{ foo: 'foo' },
						42,
						'skeletor',
						['a', 'b', 'c']
					]
				},
				arr1: {
					clone: { source: { $ref: 'arr' }, deep: true }
				}
			}).then(
				function (context) {
					// check object
					assert.defined(context.obj1, 'obj1 is defined');
					assert.defined(context.obj1.foo, 'obj1.foo is defined');
					assert.defined(context.obj1.foo.bar, 'obj1.foo.bar is defined');
					refute.same(context.orig.foo.bar, context.obj1.foo.bar); // should be diff objects
					assert.equals(context.orig.foo.bar.prop, context.obj1.foo.bar.prop);
					// check array
					assert.defined(context.arr1, 'arr1 is defined');
					assert.defined(context.arr1[0].foo, 'arr1[0].foo is defined');
					assert.defined(context.arr1[1], 'arr1[1] is defined');
					assert.defined(context.arr1[2], 'arr1[2] is defined');
					for (var i = 0; i < 3; i++) {
						assert.defined(context.arr1[3][i], 'arr1[3][' + i + '] is defined');
						assert.equals(context.arr1[3][i], context.arr[3][i]);
					}
					// check that copies were made
					refute.same(context.arr[0], context.arr1[0], 'object array element');
					refute.same(context.arr[3], context.arr1[3], 'nested array element');
				},
				fail
			).then(done, done);
		},

		'should copy all enumerable properties of an object': function (done) {
			createContext({
				orig: {
					literal: {
						foo: 'foo',
						bar: 'bar'
					}
				},
				copy: {
					clone: { $ref: 'orig' }
				}
			}).then(
				function (context) {
					assert.defined(context.copy, 'copy exists');
					assert.defined(context.copy.foo, 'copy.foo exists');
					assert.defined(context.copy.bar, 'copy.bar exists');
				},
				fail
			).then(done, done);
		},

		'should call constructor when cloning an object with a constructor': function(done) {
			function Fabulous () {
				this.instanceProp = 'instanceProp';
			}
			Fabulous.prototype = {
				prototypeProp: 'prototypeProp'
			};
			createContext({
				fab: {
					create: Fabulous
				},
				copy: {
					clone: { $ref: 'fab' }
				}
			}).then(
				function(context) {
					assert.defined(context.copy, 'copy is defined');
					assert.defined(context.copy.prototypeProp, 'copy.prototypeProp is defined');
					assert.defined(context.copy.instanceProp, 'copy.instanceProp is defined');
					refute.same(context.copy, context.fab);
				},
				fail
			).then(done, done);
		}
	},

	'mixin facet': {
		'should mixin': function(done) {
			createContext({
				target: {
					literal: { a: 0 },
					mixin: [{ $ref: 'mixin1' }]
				},
				mixin1: {
					b: 1
				}
			}).then(
				function(context) {
					assert.equals(context.target.a, 0);
					assert.equals(context.target.b, 1);
				},
				fail
			).then(done, done);
		},

		'should allow mixins to override': function(done) {
			createContext({
				target: {
					literal: { a: 0 },
					mixin: [{ $ref: 'mixin1' }]
				},
				mixin1: {
					a: 1
				}
			}).then(
				function(context) {
					assert.equals(context.target.a, 1);
				},
				fail
			).then(done, done);
		}
	},

	'properties facet': {
		'should set object properties': function(done) {
			createContext({
				c: {
					literal: {},
					properties: {
						success: true
					}
				}
			}).then(
				function(context) {
					assert(context.c.success);
				},
				fail
			).then(done, done);
		}
	},

	'create factory': {
		'should call non-constructor functions': function(done) {
			var spy = this.spy();
			createContext({
				test: {
					create: spy
				}
			}).then(
				function(context) {
					assert.calledOnce(spy);
					assert('test' in context);
				},
				fail
			).then(done, done);
		},

		'should call function with single arg': function(done) {
			var spy = this.stub().returns(2);
			createContext({
				test: {
					create: {
						module: spy,
						args: 1
					}
				}
			}).then(
				function(context) {
					assert.calledOnceWith(spy, 1);
					assert.equals(context.test, 2);
				},
				fail
			).then(done, done);
		},

		'should call function with multiple arg': function(done) {
			var spy = this.stub().returns(3);
			createContext({
				test: {
					create: {
						module: spy,
						args: [1, 2]
					}
				}
			}).then(
				function(context) {
					assert.calledOnceWith(spy, 1, 2);
					assert.equals(context.test, 3);
				},
				fail
			).then(done, done);
		},

		'should call constructor functions using new': function(done) {
			createContext({
				test: {
					create: Constructor
				}
			}).then(
				function(context) {
					assert(context.test instanceof Constructor);
				},
				fail
			).then(done, done);
		},

		'should call constructor functions with args': function(done) {
			createContext({
				test: {
					create: {
						module: Constructor,
						args: 1
					}
				}
			}).then(
				function(context) {
					assert(context.test instanceof Constructor);
					assert.equals(context.test.value, 1);
				},
				fail
			).then(done, done);
		},

		'should wire args': function(done) {
			var stub1, stub2, stub3;

			stub1 = this.stub().returns(1);
			stub2 = this.stub().returns(2);
			stub3 = this.stub().returns(3);

			createContext({
				test: {
					create: {
						module: stub3,
						args: [
							{
								create: {
									module: stub1,
									args: 1
								}
							},
							{
								create: {
									module: stub2,
									args: 2
								}
							}
						]
					}
				}
			}).then(
				function(context) {
					assert.calledOnceWith(stub1, 1);
					assert.calledOnceWith(stub2, 2);
					assert.calledOnceWith(stub3, 1, 2);
					assert.equals(context.test, 3);
				},
				fail
			).then(done, done);
		},

		'should beget new object when used with object module': function(done) {
			createContext({
				child: {
					create: {
						module: new Constructor(1)
					}
				}
			}).then(
				function(context) {
					assert(context.child instanceof Constructor);
					assert.equals(context.child.value, 1);
					refute(context.child.hasOwnPropety('value'));
				}
			).then(done, done);
		},

		'should beget new object when used with constructed object ref': function(done) {
			createContext({
				parent: {
					create: {
						module: Constructor,
						args: 1
					}
				},
				child: {
					create: { $ref: 'parent' }
				}
			}).then(
				function(context) {
					assert(context.child instanceof Constructor);
					assert.equals(context.child.value, 1);
					refute(context.child.hasOwnPropety('value'));
				}
			).then(done, done);
		},

		'isConstructor': {
			'should call prototype-less constructor using new': function(done) {
				var Constructor = this.spy();
				createContext({
					test: {
						create: {
							module: Constructor,
							isConstructor: true
						}
					}
				}).then(
					function(context) {
						assert.defined(context.test);
						assert(Constructor.calledWithNew());
					},
					fail
				).then(done, done)
			},

			'should not call prototype-less constructor using new when not specified': function(done) {
				var Constructor = this.spy();
				createContext({
					test: {
						create: {
							module: Constructor
						}
					}
				}).then(
					function(context) {
						refute(context.test);
						refute(Constructor.calledWithNew());
					},
					fail
				).then(done, done)
			}
		}
	},

	'init facet': {
		'should call method with arguments': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						init: function(val) { result = val; }
					},
					init: { init: 2 }
				}
			}).then(
				function() {
					assert.equals(result, 2);
				},
				fail
			).then(done, done);
		},

		'should abort if method throws': function(done) {
			createContext({
				test: {
					literal: {
						init: function() { throw sentinel; }
					},
					init: 'init'
				}
			}).then(
				fail,
				function(e) {
					assert.same(e, sentinel);
				}
			).then(done, done);
		},

		'should allow returning a promise': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						init: function() {
							return { then: function(f) { f(result = sentinel); } };
						}
					},
					init: { init: 1 }
				}
			}).then(
				function() {
					assert.equals(result, sentinel);
				},
				fail
			).then(done, done);
		},

		'should abort if method returns a rejected promise': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						init: function() {
							return { then: function(f, r) { r(result = sentinel); } };
						}
					},
					init: { init: 1 }
				}
			}).then(
				fail,
				function() {
					assert.equals(result, sentinel);
				}
			).then(done, done);
		}
	},

	'ready facet': {
		'should call method with arguments': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						ready: function(val) { result = val; }
					},
					ready: { ready: 2 }
				}
			}).then(
				function() {
					assert.equals(result, 2);
				},
				fail
			).then(done, done);
		},

		'should abort if method throws': function(done) {
			createContext({
				test: {
					literal: {
						ready: function() { throw sentinel; }
					},
					ready: 'ready'
				}
			}).then(
				fail,
				function(e) {
					assert.same(e, sentinel);
				}
			).then(done, done);
		},

		'should allow returning a promise': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						ready: function() {
							return { then: function(f) { f(result = sentinel); } };
						}
					},
					ready: { ready: 1 }
				}
			}).then(
				function() {
					assert.equals(result, sentinel);
				},
				fail
			).then(done, done);
		},

		'should abort if method returns a rejected promise': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						ready: function() {
							return { then: function(f, r) { r(result = sentinel); } };
						}
					},
					ready: { ready: 1 }
				}
			}).then(
				fail,
				function() {
					assert.equals(result, sentinel);
				}
			).then(done, done);
		}
	},

	'destroy facet': {
		'should call method with arguments': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						destroy: function(val) { result = val; }
					},
					destroy: { destroy: 1 }
				}
			}).then(
				function(context) {
					refute.equals(result, 1);
					return context.destroy();
				}
			).then(
				function() {
					assert.equals(result, 1);
				}
			).otherwise(fail).then(done, done);
		}
	},

	'compose factory': {
		'should compose array of functions': function(done) {
			createContext({
				f1: plusOne,
				f2: plusOne,
				composed: {
					compose: [
						{ $ref: 'f1' },
						{ $ref: 'f2' }
					]
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1), 3);
				}
			).then(done, done);
		},

		'should return a promise when array introduces a promise': function(done) {
			createContext({
				f1: plusOne,
				f2: promisedPlusOne,
				f3: plusOne,
				composed: {
					compose: [
						{ $ref: 'f1' },
						{ $ref: 'f2' },
						{ $ref: 'f3' }
					]
				}
			}).then(
				function(c) {
					var result = c.composed(1);
					assert.isFunction(result.then);
					return result.then(function(result) {
						assert.equals(result, 4);
					});
				}
			).then(done, done);
		},

		'should compose a string specification': function(done) {
			createContext({
				f1: plusOne,
				f2: plusOne,
				composed: {
					compose: 'f1 | f2'
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1), 3);
				}
			).then(done, done);
		},

		'should return a promise when pipeline introduces a promise': function(done) {
			createContext({
				f1: plusOne,
				f2: promisedPlusOne,
				f3: plusOne,
				composed: {
					compose: 'f1 | f2 | f3'
				}
			}).then(
				function(c) {
					var result = c.composed(1);
					assert.isFunction(result.then);
					return result.then(function(result) {
						assert.equals(result, 4);
					});
				}
			).then(done, done);
		},

		'should allow multiple args when composing a string specification': function(done) {
			createContext({
				f1: plus,
				f2: plusOne,
				composed: {
					compose: 'f1 | f2'
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1, 2), 4);
				}
			).then(done, done);
		},

		'should compose a string specification with single function': function(done) {
			createContext({
				f1: plusOne,
				composed: {
					compose: 'f1'
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1), 2);
				}
			).then(done, done);
		},

		'should compose a string specification with contexts': function(done) {
			createContext({
				f1: plusOne,
				t1: { literal: new Thing(1) },
				t2: { literal: new Thing(1) },
				composed: {
					compose: 't1.f | f1 | t2.f'
				}
			}).then(
				function(c) {
					assert.equals(c.composed(1), 4);
				},
				fail
			).then(done, done);
		},

		'should support reference resolvers in pipelines': function(done) {
			var plugin, spy;

			spy = this.stub().returns(plusOne);
			plugin = {
				wire$plugin: function() {
					return { resolvers: {
						test: function(resolver) {
							resolver.resolve(spy.apply(null, arguments));
						}
					}}
				}
			};

			createContext({
				f1: plus,
				composed: {
					compose: 'f1 | test!blah'
				},
				plugins: [plugin]
			}).then(
				function() {
					assert.calledOnce(spy);
				}
			).then(done, done);
		},

		'unresolvable ref in pipeline should fail wiring': function(done) {
			createContext({
				f1: plus,
				composed: {
					compose: 'f1 | test!blah'
				}
			}).then(
				fail,
				function(e) {
					assert.defined(e);
				}
			).then(done, done);
		}

	},

	'invoker factory': {
		'should wire to a function': function(done) {
			createContext({
				i1: {
					invoker: {
						method: 'f', args: []
					}
				}
			}).then(
				function(c) {
					assert.isFunction(c.i1);
				},
				fail
			).then(done, done);
		},

		'should invoke method on target': function(done) {
			var spy, expected;

			spy = this.spy();
			expected = 1;

			createContext({
				i1: {
					invoker: {
						method: 'f', args: [expected]
					}
				},
				t1: {
					literal: {},
					properties: {
						f: { literal: spy }
					}
				},
				component: {
					literal: {},
					properties: {
						method: { $ref: 'i1' }
					},
					ready: {
						method: { $ref: 't1' }
					}
				}
			}).then(
				function() {
					assert.calledOnceWith(spy, expected);
				},
				fail
			).then(done, done);
		}
	}
});
})(
	require('buster'),
	require('../../../../lib/context')
);