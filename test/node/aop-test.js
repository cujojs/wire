(function(buster, wire, aopPlugin, when) {
"use strict";

var assert, refute, fail, sentinel, other, fixture;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};
other = {};
fixture = require('./fixtures/object');

buster.testCase('aop', {

	'decorate': {
		'should decorate in order': function(done) {
			function decorator(target, value) {
				target.value += value;
			}

			wire({
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
			).then(done, done);
		}
	},

	'advice': {

		'before': {
			'should execute function before method': function(done) {
				var spy = this.spy();

				wire({
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
				).then(done, done);
			}
		},

		'around': {

			'should execute function around method': function(done) {
				var beforeSpy, afterSpy;

				beforeSpy = this.spy();
				afterSpy = this.spy();

				function around(joinpoint) {
					beforeSpy.apply(null, joinpoint.args);
					afterSpy(joinpoint.proceed());
				}

				wire({
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
				).then(done, done);
			}

		},

		'afterReturning': {

			'should execute function after method returns': function(done) {
				var spy = this.spy();

				wire({
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
				).then(done, done);
			},

			'should not execute function after method throws': function(done) {
				var spy = this.spy();

				wire({
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
				).then(done, done);
			}
		},

		'afterThrowing': {

			'should execute function after method throws': function(done) {
				var spy = this.spy();

				wire({
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
				).then(done, done);
			},

			'should not execute function after method returns': function(done) {
				var spy = this.spy();

				wire({
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
				).then(done, done);
			}
		},

		'after': {

			'should execute function after method returns': function(done) {
				var spy = this.spy();

				wire({
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
				).then(done, done);
			},

			'should execute function after method throws': function(done) {
				var spy = this.spy();

				wire({
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
				).then(done, done);
			}
		},

		'that is promise-aware': {

			'afterFulfilling': {
				'should execute function after returned promise is fulfilled': function(done) {
					var spy = this.spy();

					wire({
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
					).then(done, done);
				},

				'should not execute function after returned promise is rejected': function(done) {
					var spy = this.spy();

					wire({
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
					).then(done, done);
				}
			},

			'afterRejecting': {
				'should execute function after returned promise is rejected': function(done) {
					var spy = this.spy();

					wire({
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
					).then(done, done);
				},

				'should not execute function after returned promise is fulfilled': function(done) {
					var spy = this.spy();

					wire({
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
					).then(done, done);
				}
			},

			'after': {
				'should execute function after returned promise is fulfilled': function(done) {
					var spy = this.spy();

					wire({
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
					).then(done, done);
				},

				'should execute function after returned promise is rejected': function(done) {
					var spy = this.spy();

					wire({
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
					).then(done, done);
				}
			}
		}
	}
});

})(
	require('buster'),
	require('../../wire'),
	require('../../aop'),
	require('when')
);