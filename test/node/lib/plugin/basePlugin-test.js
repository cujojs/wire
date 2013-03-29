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

buster.testCase('lib/plugin/basePlugin', {
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
	}
});
})(
	require('buster'),
	require('../../../../lib/context')
);