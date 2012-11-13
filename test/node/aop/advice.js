(function(buster, wire, when) {
"use strict";

var assert, refute, fail, sentinel, other, fixture;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};
other = {};
fixture = require('../fixtures/object');

buster.testCase('wire/aop', {

	tearDown: function() {
		delete fixture.method;
	},

	'before': {
		'should execute function before method': function(done) {
			var spy = this.spy();

			fixture.method = function() {};

			wire({
				aop: { module: '../../../aop' },
				target: {
					create: '../fixtures/object',
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

			fixture.method = this.stub().returns(sentinel);

			wire({
				aop: { module: '../../../aop' },
				target: {
					create: '../fixtures/object',
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

			fixture.method = this.stub().returns(sentinel);

			wire({
				aop: { module: '../../../aop' },
				target: {
					create: '../fixtures/object',
					afterReturning: {
						method: 'handler.test'
					}
				},
				handler: {
					test: spy
				}
			}, { require: require }).then(
				function(context) {
					context.target.method(other);
					assert.calledOnceWith(spy, sentinel);
				},
				fail
			).then(done, done);
		},

		'should not execute function after method throws': function(done) {
			var spy = this.spy();

			fixture.method = this.stub().throws(sentinel);

			wire({
				aop: { module: '../../../aop' },
				target: {
					create: '../fixtures/object',
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

			fixture.method = this.stub().throws(sentinel);

			wire({
				aop: { module: '../../../aop' },
				target: {
					create: '../fixtures/object',
					afterThrowing: {
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

					assert.calledOnceWith(spy, sentinel);
				},
				fail
			).then(done, done);
		},

		'should not execute function after method returns': function(done) {
			var spy = this.spy();

			fixture.method = this.stub().returns(sentinel);

			wire({
				aop: { module: '../../../aop' },
				target: {
					create: '../fixtures/object',
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

			fixture.method = this.stub().returns(sentinel);

			wire({
				aop: { module: '../../../aop' },
				target: {
					create: '../fixtures/object',
					after: {
						method: 'handler.test'
					}
				},
				handler: {
					test: spy
				}
			}, { require: require }).then(
				function(context) {
					context.target.method(other);
					assert.calledOnceWith(spy, sentinel);
				},
				fail
			).then(done, done);
		},

		'should execute function after method throws': function(done) {
			var spy = this.spy();

			fixture.method = this.stub().throws(sentinel);

			wire({
				aop: { module: '../../../aop' },
				target: {
					create: '../fixtures/object',
					after: {
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

					assert.calledOnceWith(spy, sentinel);
				},
				fail
			).then(done, done);
		}
	},

	'Promise-aware': {

		setUp: function() {
			fixture.resolver = when.resolve;
			fixture.rejecter = when.reject;
		},

		tearDown: function() {
			delete fixture.resolver;
			delete fixture.rejecter;
		},

		'afterFulfilling': {
			'should execute function after returned promise is fulfilled': function(done) {
				var spy = this.spy();

				wire({
					aop: { module: '../../../aop' },
					target: {
						create: '../fixtures/object',
						afterFulfilling: {
							resolver: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						context.target.resolver(sentinel);
						assert.calledOnceWith(spy, sentinel);
					},
					fail
				).then(done, done);
			},

			'should not execute function after returned promise is rejected': function(done) {
				var spy = this.spy();

				wire({
					aop: { module: '../../../aop' },
					target: {
						create: '../fixtures/object',
						afterFulfilling: {
							resolver: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						context.target.rejecter();
						refute.called(spy);
					},
					fail
				).then(done, done);
			}
		},

		'afterRejecting': {
			'should execute function after returned promise is rejected': function(done) {
				var spy = this.spy();

				wire({
					aop: { module: '../../../aop' },
					target: {
						create: '../fixtures/object',
						afterRejecting: {
							rejecter: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						context.target.rejecter(sentinel);
						assert.calledOnceWith(spy, sentinel);
					},
					fail
				).then(done, done);
			},

			'should not execute function after returned promise is fulfilled': function(done) {
				var spy = this.spy();

				wire({
					aop: { module: '../../../aop' },
					target: {
						create: '../fixtures/object',
						afterRejecting: {
							resolver: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						context.target.resolver();
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
					aop: { module: '../../../aop' },
					target: {
						create: '../fixtures/object',
						after: {
							resolver: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						context.target.resolver(sentinel);
						assert.calledOnceWith(spy, sentinel);
					},
					fail
				).then(done, done);
			},

			'should execute function after returned promise is rejected': function(done) {
				var spy = this.spy();

				wire({
					aop: { module: '../../../aop' },
					target: {
						create: '../fixtures/object',
						after: {
							rejecter: 'handler.test'
						}
					},
					handler: {
						test: spy
					}
				}, { require: require }).then(
					function(context) {
						context.target.rejecter(sentinel);
						assert.calledOnceWith(spy, sentinel);
					},
					fail
				).then(done, done);
			}
		}
	}

});

})(
	require('buster'),
	require('../../../wire'),
	require('when')
);