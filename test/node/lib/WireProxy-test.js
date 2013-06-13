(function(buster, delay, WireProxy) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('proxy', {
	'should create a base proxy for the supplied target': function() {
		var p, target;

		target = {};
		p = WireProxy.create(target);

		assert.same(p.target, target);
	},

	'should set properties on target': function() {
		var p, target;

		target = {};

		p = WireProxy.create(target);
		p.set('test', 1);

		assert.equals(target.test, 1);
	},

	'should get properties on target': function() {
		var p, target;

		target = { test: 1 };
		p = WireProxy.create(target);

		assert.equals(p.get('test'), 1);
	},

	invoke: {
		'should invoke named methods on target': function() {
			var p, target;

			target = { method: this.spy() };
			p = WireProxy.create(target);

			p.invoke('method', [1]);
			assert.calledOnceWith(target.method, 1);
		},

		'should invoke function on target': function() {
			var p, target, expectedVal;

			function method(arg) {
				assert.same(this, target);
				assert.equals(arg, expectedVal);
			}

			expectedVal = 1;
			target = {};
			p = WireProxy.create(target);

			p.invoke(method, [expectedVal]);
		}

	},

	advise: {
		'should advise named methods': function() {
			var p, method, before, after;

			method = this.spy(function() { return 3; });
			before = this.spy();
			after = this.spy();

			p = WireProxy.create({ method: method });
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

			p = WireProxy.create({ method: method });
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

			p = WireProxy.create({ method: method });
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

		'should remove aspects when proxy is destroyed': function() {
			var p, method, before;

			method = this.spy();
			before = this.spy();

			p = WireProxy.create({ method: method });
			p.advise('method', { before: before });

			p.target.method(1, 2);

			assert.calledOnceWith(before, 1, 2);
			assert.calledOnceWith(method, 1, 2);
			assert.callOrder(before, method);

			p.destroy();

			p.target.method(3, 4);

			refute.calledTwice(before);
			assert.calledTwice(method);
		}
	},

	clone: {
		'should return primitives': function() {
			assert.equals(1, WireProxy.create(1).clone());
		},

		'should clone Function': function() {
			var expected, clone;

			function original() {
				return expected;
			}

			expected = {};
			clone = WireProxy.create(original).clone();

			refute.same(original, clone);
			assert.same(clone(), expected);
		},

		'should clone Date': function() {
			var clone, original;

			original = new Date();

			clone = WireProxy.create(original).clone();

			refute.same(original, clone);
			assert.equals(original.getTime(), clone.getTime());
		},

		'should clone RegExp': function() {
			var clone, original;

			original = /123/;

			clone = WireProxy.create(original).clone();

			refute.same(original, clone);
			assert.equals(original.toString(), clone.toString());
		},

		object: {
			'should clone objects': function() {
				var p, clone, original;

				original = { a: 1 };

				p = WireProxy.create(original);
				clone = p.clone();

				refute.same(original, clone);
				assert.equals(original, clone);
			},

			'should clone objects deeply when specified': function() {
				var p, clone, original, deepObject, deepArray;

				deepObject = { b: 2 };
				deepArray = [3];
				original = { a: deepObject, b: deepArray };

				p = WireProxy.create(original);
				clone = p.clone({ deep: true });

				refute.same(deepObject, clone.a);
				assert.equals(deepObject, clone.a);
				
				refute.same(deepArray, clone.b);
				assert.equals(deepArray, clone.b);
			}

		},

		array: {
			'should clone arrays': function() {
				var p, clone, original;

				original = [1, 2, 3];

				p = WireProxy.create(original);
				clone = p.clone();

				refute.same(original, clone);
				assert.equals(original, clone);
			},

			'should clone arrays deeply when specified': function() {
				var p, clone, original, deepObject, deepArray;

				deepObject = {};
				deepArray = [3];
				original = [deepObject, deepArray];

				p = WireProxy.create(original);
				clone = p.clone({ deep: true });

				refute.same(deepObject, clone[0]);
				assert.equals(deepObject, clone[0]);

				refute.same(deepArray, clone[1]);
				assert.equals(deepArray, clone[1]);
			}

		}

	}
});
})(
	require('buster'),
	require('when/delay'),
	require('../../../lib/WireProxy')
);