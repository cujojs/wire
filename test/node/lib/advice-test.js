(function(buster, advice) {
'use strict';

var assert, refute, fail, sentinel, other;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};
other = {};

function noop() {}

buster.testCase('lib/advice', {

	'after': {
		'should execute advice after f': function() {
			var f, a, advised;

			f = this.spy();
			a = this.spy();

			advised = advice.after(f, a);
			advised();

			assert.callOrder(f, a);
		},

		'should pass result to advice': function() {
			var f, a, advised;

			f = this.stub().returns(sentinel);
			a = this.spy();

			advised = advice.after(f, a);
			advised();

			assert.calledOnceWith(a, sentinel);
		},

		'should return advice result': function() {
			var f, a, advised;

			f = this.stub().returns(other);
			a = this.stub().returns(sentinel);

			advised = advice.after(f, a);
			assert.same(advised(), sentinel);
		},

		'should be skipped if f throws': function() {
			var f, a, advised;

			f = this.stub().throws(sentinel);
			a = this.spy();

			advised = advice.after(f, a);

			assert.exception(advised);
			refute.called(a);
		}
	},

	'beforeAsync': {
		'should return a promise': function() {
			var advised = advice.beforeAsync(noop, noop);
			assert.isFunction(advised().then);
		},

		'should execute advice before f': function(done) {
			var f, a, advised;

			f = this.spy();
			a = this.spy();

			advised = advice.beforeAsync(f, a);
			advised().then(
				function() { assert.callOrder(a, f); },
				fail
			).then(done, done);
		},

		'should pass args to advice and f': function(done) {
			var f, a, advised;

			f = this.spy();
			a = this.spy();

			advised = advice.beforeAsync(f, a);
			advised(sentinel).then(
				function() { assert.calledOnceWith(a, sentinel); },
				fail
			).then(done, done);
		},

		'should fulfill returned promise with f result': function(done) {
			var f, a, advised;

			f = this.stub().returns(sentinel);
			a = this.stub().returns(other);

			advised = advice.beforeAsync(f, a);
			advised().then(
				function(result) { assert.same(result, sentinel); },
				fail
			).then(done, done);
		},

		'should skip f if advice fails': function(done) {
			var f, a, advised;

			f = this.stub().throws(other);
			a = this.stub().throws(sentinel);

			advised = advice.beforeAsync(f, a);
			advised().then(
				fail,
				function(e) {
					assert.same(e, sentinel);
					refute.called(f);
				}
			).then(done, done);
		}
	},

	'afterAsync': {
		'should return a promise': function() {
			var advised = advice.afterAsync(noop, noop);
			assert.isFunction(advised().then);
		},

		'should execute advice before f': function(done) {
			var f, a, advised;

			f = this.spy();
			a = this.spy();

			advised = advice.afterAsync(f, a);
			advised().then(
				function() { assert.callOrder(f, a); },
				fail
			).then(done, done);
		},

		'should pass f result to advice': function(done) {
			var f, a, advised;

			f = this.stub().returns(sentinel);
			a = this.spy();

			advised = advice.afterAsync(f, a);
			advised(other).then(
				function() { assert.calledOnceWith(a, sentinel); },
				fail
			).then(done, done);
		},

		'should fulfill returned promise with advice result': function(done) {
			var f, a, advised;

			f = this.stub().returns(other);
			a = this.stub().returns(sentinel);

			advised = advice.afterAsync(f, a);
			advised().then(
				function(result) { assert.same(result, sentinel); },
				fail
			).then(done, done);
		},

		'should skip advice if f fails': function(done) {
			var f, a, advised;

			f = this.stub().throws(sentinel);
			a = this.stub().throws(other);

			advised = advice.afterAsync(f, a);
			advised().then(
				fail,
				function(e) {
					assert.same(e, sentinel);
					refute.called(a);
				}
			).then(done, done);
		}
	}

});

})(
	require('buster'),
	require('../../../lib/advice')
);