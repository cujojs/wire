(function(buster, wire) {
"use strict";

var assert, refute, fail, functionModule, constructorModule;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

functionModule = './test/node/fixtures/function';
constructorModule = './test/node/fixtures/constructor';

buster.testCase('create', {
	'should call non-constructor functions': function(done) {
		wire({
			test: {
				create: functionModule
			}
		}).then(
			function(context) {
				assert('test' in context);
			},
			fail
		).then(done, done);
	},

	'should call function with single arg': function(done) {
		wire({
			test: {
				create: {
					module: functionModule,
					args: 1
				}
			}
		}).then(
			function(context) {
				assert.equals(context.test, 1);
			},
			fail
		).then(done, done);
	},

	'should call function with multiple arg': function(done) {
		wire({
			test: {
				create: {
					module: functionModule,
					args: [1, 2]
				}
			}
		}).then(
			function(context) {
				assert.equals(context.test, 3);
			},
			fail
		).then(done, done);
	},

	'should call constructor functions using new': function(done) {
		wire({
			test: {
				create: constructorModule
			}
		}).then(
			function(context) {
				assert.typeOf(context.test, 'object');
			},
			fail
		).then(done, done);
	},

	'should call constructor functions with args': function(done) {
		wire({
			test: {
				create: {
					module: constructorModule,
					args: 1
				}
			}
		}).then(
			function(context) {
				assert.equals(context.test.value, 1);
			},
			fail
		).then(done, done);
	},

	'should wire args': function(done) {
		wire({
			test: {
				create: {
					module: functionModule,
					args: [
						{
							create: {
								module: functionModule,
								args: 1
							}
						},
						{
							create: {
								module: functionModule,
								args: 2
							}
						}
					]
				}
			}
		}).then(
			function(context) {
				assert.equals(context.test, 3);
			},
			fail
		).then(done, done);
	}

});

})(
	require('buster'),
	require('../..')
);