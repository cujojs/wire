(function(buster, invoker) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

buster.testCase('lib/invoker', {
	'should return a function': function() {
		assert.isFunction(invoker('foo', []));
	},

	'should invoke method on target': function() {
		var i, fixture, expected, result;

		expected = {};
		fixture = {
			method: this.stub().returns(expected)
		};

		i = invoker('method', [expected]);

		result = i(fixture);

		assert.calledOnceWith(fixture.method, expected);
		assert.same(result, expected);
	}
});

})(
	require('buster'),
	require('../../lib/invoker')
);