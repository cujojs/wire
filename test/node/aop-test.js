(function(buster, wire, aopPlugin, when) {
"use strict";

var assert, refute, fail, sentinel, other;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

sentinel = {};
other = {};

buster.testCase('aop', {

	'decorate': {
		'should decorate in order': function() {
			function decorator(target, value) {
				target.value += value;
			}

			return wire({
				plugins: [aopPlugin],
				mydecorator1: decorator,
				mydecorator2: decorator,
				test: {
					literal: { value: 'a' },
					decorate: {
						mydecorator2: ['b'],
						mydecorator1: ['c']
					}
				}
			}).then(
				function(context) {
					assert.equals(context.test.value, 'abc');
				},
				fail
			);
		}
	},

	'advice': {

		'before': {
			'should execute function before method': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: function() {}
						},
						before: {
							method: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						context.target.method(sentinel);
						assert.calledOnceWith(spy, sentinel);
					},
					fail
				);
			},

			'should execute multiple functions before method': function() {
				var spy1 = this.spy();
				var spy2 = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: function() {}
						},
						before: {
							method: [
								'handler.test1',
								'handler.test2'
							]
						}
					},
					handler: {
						test1: spy1,
						test2: spy2
					}
				}, { require: require }).then(
					function(context) {
						context.target.method(sentinel);
						assert.calledOnceWith(spy1, sentinel);
						assert.calledOnceWith(spy2, sentinel);
					},
					fail
				);
			},

			'should fail when self advised method is missing': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {},
						before: {
							method: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}).then(
					fail,
					function(e) {
						assert(e);
					}
				);
			},

			'should fail when other advised method is missing': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {},
						before: {
							'handler.test': 'method'
						}
					},
					handler: {
						test: spy
					}
				}).then(
					fail,
					function(e) {
						assert(e);
					}
				);
			}
		},

		'around': {

			'should execute function around method': function() {
				var beforeSpy, afterSpy;

				beforeSpy = this.spy();
				afterSpy = this.spy();

				function around(joinpoint) {
					beforeSpy.apply(null, joinpoint.args);
					afterSpy(joinpoint.proceed());
				}

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().returns(sentinel)
						},
						around: {
							method: 'handler.test'
						}
					},
					handler: {
						test: around
					}
				}, { require: require }).then(
					function(context) {
						context.target.method(other);
						assert.calledOnceWith(beforeSpy, other);
						assert.calledOnceWith(afterSpy, sentinel);
					},
					fail
				);
			}

		},

		'afterReturning': {

			'should execute function after method returns': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().returns(sentinel)
						},
						afterReturning: {
							method: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require })
					.then(
					function(context) {
						return context.target.method(sentinel);
					}
				).then(
					function() {
						assert.calledOnceWith(spy, sentinel);
					},
					fail
				);
			},

			'should execute multiple functions after method returns': function() {
				var spy1 = this.spy();
				var spy2 = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().returns(sentinel)
						},
						afterReturning: {
							method: [
								'handler.test1',
								'handler.test2'
              ]
						}
					},
					handler: {
						test1: spy1,
            test2: spy2
					}
				}, { require: require })
					.then(
					function(context) {
						return context.target.method(sentinel);
					}
				).then(
					function() {
						assert.calledOnceWith(spy1, sentinel);
						assert.calledOnceWith(spy2, sentinel);
					},
					fail
				);
			},

			'should not execute function after method throws': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().throws(sentinel)
						},
						afterReturning: {
							method: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						try {
							// AOP still propagates exceptions, so must catch here
							// to allow test to continue.
							context.target.method(other);
						} catch(e) {}

						refute.called(spy);
					},
					fail
				);
			}
		},

		'afterThrowing': {

			'should execute function after method throws': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().throws(sentinel)
						},
						afterThrowing: {
							method: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require })
					.then(
					function(context) {
						context.target.method(other);
					}
				).then(
					fail,
					function() {
						assert.calledOnceWith(spy, sentinel);
					}
				);
			},

			'should execute multiple functions after method throws': function() {
				var spy1 = this.spy();
				var spy2 = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().throws(sentinel)
						},
						afterThrowing: {
							method: [
								'handler.test1',
								'handler.test2'
							]
						}
					},
					handler: {
						test1: spy1,
						test2: spy2
					}
				}, { require: require })
					.then(
					function(context) {
						context.target.method(other);
					}
				).then(
					fail,
					function() {
						assert.calledOnceWith(spy1, sentinel);
						assert.calledOnceWith(spy2, sentinel);
					}
				);
			},

			'should not execute function after method returns': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().returns(sentinel)
						},
						afterThrowing: {
							method: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						context.target.method(other);
						refute.called(spy);
					},
					fail
				);
			}
		},

		'after': {

			'should execute function after method returns': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().returns(sentinel)
						},
						after: {
							method: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require })
					.then(
					function(context) {
						return context.target.method(sentinel);
					}
				).then(
					function() {
						assert.calledOnceWith(spy, sentinel);
					},
					fail
				);
			},

			'should execute multiple functions after method returns': function() {
				var spy1 = this.spy();
				var spy2 = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().returns(sentinel)
						},
						after: {
							method: [
								'handler.test1',
								'handler.test2'
							]
						}
					},
					handler: {
						test1: spy1,
						test2: spy2
					}
				}, { require: require })
					.then(
					function(context) {
						return context.target.method(sentinel);
					}
				).then(
					function() {
						assert.calledOnceWith(spy1, sentinel);
						assert.calledOnceWith(spy2, sentinel);
					},
					fail
				);
			},

			'should execute function after method throws': function() {
				var spy = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().throws(sentinel)
						},
						after: {
							method: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require })
					.then(
					function(context) {
						context.target.method(other);
					}
				).then(
					fail,
					function() {
						assert.calledOnceWith(spy, sentinel);
					}
				);
			},

			'should execute multiple functions after method throws': function() {
				var spy1 = this.spy();
				var spy2 = this.spy();

				return wire({
					plugins: [aopPlugin],
					target: {
						literal: {
							method: this.stub().throws(sentinel)
						},
						after: {
							method: [
								'handler.test1',
								'handler.test2'
              ]
						}
					},
					handler: {
						test1: spy1,
						test2: spy2
					}
				}, { require: require })
					.then(
					function(context) {
						context.target.method(other);
					}
				).then(
					fail,
					function() {
						assert.calledOnceWith(spy1, sentinel);
						assert.calledOnceWith(spy2, sentinel);
					}
				);
			}
		},

		'that is promise-aware': {

			'afterFulfilling': {
				'should execute function after returned promise is fulfilled': function() {
					var spy = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when(sentinel))
							},
							afterFulfilling: {
								method: 'handler.test'
							}
						},
						handler: {
							test: spy
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method(other);
						}
					).then(
						function() {
							assert.calledOnceWith(spy, sentinel);
						},
						fail
					);
				},

				'should execute multiple functions after returned promise is fulfilled': function() {
					var spy1 = this.spy();
					var spy2 = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when(sentinel))
							},
							afterFulfilling: {
								method: [
									'handler.test1',
									'handler.test2'
								]
							}
						},
						handler: {
							test1: spy1,
							test2: spy2
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method(other);
						}
					).then(
						function() {
							assert.calledOnceWith(spy1, sentinel);
							assert.calledOnceWith(spy2, sentinel);
						},
						fail
					);
				},

				'should not execute function after returned promise is rejected': function() {
					var spy = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: when.reject
							},
							afterFulfilling: {
								method: 'handler.test'
							}
						},
						handler: {
							test: spy
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method();
						}
					).then(
						fail,
						function() {
							refute.called(spy);
						}
					);
				}
			},

			'afterRejecting': {
				'should execute function after returned promise is rejected': function() {
					var spy = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when.reject(sentinel))
							},
							afterRejecting: {
								method: 'handler.test'
							}
						},
						handler: {
							test: spy
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method(other);
						}
					).then(
						fail,
						function() {
							assert.calledOnceWith(spy, sentinel);
						}
					);
				},

				'should execute multiples function after returned promise is rejected': function() {
					var spy1 = this.spy();
					var spy2 = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when.reject(sentinel))
							},
							afterRejecting: {
								method: [
									'handler.test1',
									'handler.test2'
								]
							}
						},
						handler: {
							test1: spy1,
							test2: spy2
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method(other);
						}
					).then(
						fail,
						function() {
							assert.calledOnceWith(spy1, sentinel);
							assert.calledOnceWith(spy2, sentinel);
						}
					);
				},

				'should not execute function after returned promise is fulfilled': function() {
					var spy = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when())
							},
							afterRejecting: {
								method: 'handler.test'
							}
						},
						handler: {
							test: spy
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method();
						}
					).then(
						function() {
							refute.called(spy);
						},
						fail
					);
				}
			},

			'after': {
				'should execute function after returned promise is fulfilled': function() {
					var spy = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when(sentinel))
							},
							after: {
								method: 'handler.test'
							}
						},
						handler: {
							test: spy
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method(other);
						}
					).then(
						function() {
							assert.calledOnceWith(spy, sentinel);
						},
						fail
					);
				},

				'should execute multiple functions after returned promise is fulfilled': function() {
					var spy1 = this.spy();
					var spy2 = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when(sentinel))
							},
							after: {
								method: [
									'handler.test1',
									'handler.test2'
								]
							}
						},
						handler: {
							test1: spy1,
							test2: spy2
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method(other);
						}
					).then(
						function() {
							assert.calledOnceWith(spy1, sentinel);
							assert.calledOnceWith(spy2, sentinel);
						},
						fail
					);
				},

				'should execute function after returned promise is rejected': function() {
					var spy = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when.reject(sentinel))
							},
							after: {
								method: 'handler.test'
							}
						},
						handler: {
							test: spy
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method(other);
						}
					).then(
						fail,
						function() {
							assert.calledOnceWith(spy, sentinel);
						}
					);
				},

				'should execute multiple functions after returned promise is rejected': function() {
					var spy1 = this.spy();
					var spy2 = this.spy();

					return wire({
						plugins: [aopPlugin],
						target: {
							literal: {
								method: this.stub().returns(when.reject(sentinel))
							},
							after: {
								method: [
									'handler.test1',
									'handler.test2'
								]
							}
						},
						handler: {
							test1: spy1,
							test2: spy2
						}
					}, { require: require })
						.then(
						function(context) {
							return context.target.method(other);
						}
					).then(
						fail,
						function() {
							assert.calledOnceWith(spy1, sentinel);
							assert.calledOnceWith(spy2, sentinel);
						}
					);
				}
			}
		}
	},

	'weaving': {
		'should weave aspects': function() {
			function aspect() {
				return {
					pointcut:       /^doSomething$/,
					before:         function() { return 1; },
					afterReturning: function() { return 1; },
					afterThrowing:  function() { return 1; },
					around: function(joinpoint) {
						try {
							joinpoint.proceed();
							return 1;
						} catch(e) {
							return 2;
						}
					}
				};
			}

			function Target() {}
			Target.prototype = {
				doSomething: function() { return 0 },
				doSomethingElse: function() { throw new Error(); },
				doOneMoreThing: function() { return 0; }
			};

			return wire({
				plugins: [
					{
						wire$plugin: aopPlugin,
						aspects: [
							'testAspect', // points to testAspect directly
							{
								// Override pointcut, but use testAspect advices
								pointcut: ['doSomethingElse'],
								advice: 'testAspect'
							}
						]
					}
				],
				testAspect: { create: aspect },
				thing1: { create: Target },
				thing2: { create: Target }
			}).then(
				function(context) {
					var t1, t2;

					t1 = context.thing1;
					t2 = context.thing2;

					assert.equals(t1.doSomething(), 1);
					assert.equals(t2.doSomething(), 1);

					assert.equals(t1.doSomethingElse(), 2);
					assert.equals(t2.doSomethingElse(), 2);

					assert.equals(t1.doOneMoreThing(), 0);
					assert.equals(t2.doOneMoreThing(), 0);
				}
			);
		}
	}
});

})(
	require('buster'),
	require('../../wire'),
	require('../../aop'),
	require('when')
);