(function(buster, delay, ObjectProxy, WireProxy) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('lib/ObjectProxy', {
	'should create a proxy for the supplied target': function() {
		var p, target;

		target = {};
		p = new ObjectProxy(target);

		assert.same(p.target, target);
		assert(WireProxy.isProxy(p));
	},

	advise: {
		'should advise named methods': function() {
			var p, method, before, after;

			method = this.spy(function() { return 3; });
			before = this.spy();
			after = this.spy();

			p = new ObjectProxy({ method: method });
			p.advise('method', { before: before, after: after });

			p.target.method(1, 2);

			assert.calledOnceWith(before, 1, 2);
			assert.calledOnceWith(method, 1, 2);
			assert.calledOnceWith(after, 3);
			assert.callOrder(before, method, after);
		},

		'should work with proxy.invoke': function() {
			var p, method, before;

			method = this.spy();
			before = this.spy();

			p = new ObjectProxy({ method: method });
			p.advise('method', { before: before });

			p.invoke('method', [1, 2]);

			assert.calledOnceWith(before, 1, 2);
			assert.calledOnceWith(method, 1, 2);
			assert.callOrder(before, method);
		},

		'should return an aspect remover': function() {
			var p, method, before, aspect;

			method = this.spy();
			before = this.spy();

			p = new ObjectProxy({ method: method });
			aspect = p.advise('method', { before: before });

			p.target.method(1, 2);

			assert.calledOnceWith(before, 1, 2);
			assert.calledOnceWith(method, 1, 2);
			assert.callOrder(before, method);

			aspect.remove();

			p.target.method(3, 4);

			refute.calledTwice(before);
			assert.calledTwice(method);
		},

		'should remove aspects when remove is called': function() {
			var p, method, before, aspect;

			method = this.spy();
			before = this.spy();

			p = new ObjectProxy({ method: method });
			aspect = p.advise('method', { before: before });

			p.target.method(1, 2);

			assert.calledOnceWith(before, 1, 2);
			assert.calledOnceWith(method, 1, 2);
			assert.callOrder(before, method);

			aspect.remove();

			p.target.method(3, 4);

			refute.calledTwice(before);
			assert.calledTwice(method);
		}
	}

});
})(
	require('buster'),
	require('when/delay'),
	require('../../../lib/ObjectProxy'),
	require('../../../lib/WireProxy')
);