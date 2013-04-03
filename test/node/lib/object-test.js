(function(buster, object) {
"use strict";

var assert, refute, fail, sentinel, other;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};
other = {};

buster.testCase('lib/object', {

	'mixin': {
		'should copy owned properties': function() {
			var result = object.mixin({ a: sentinel }, { b: other });
			assert.equals(result, { a: sentinel, b: other });
		},

		'should not copy non-owned properties': function() {
			function F() {}
			F.prototype = { a: other, b: other };

			var result = object.mixin({ a: sentinel });
			assert.same(result.a, sentinel);
			refute('b' in result);
		},

		'from should override to': function() {
			var result = object.mixin({ a: other }, { a: sentinel });
			assert.same(result.a, sentinel);
		},

		'should handle falsey from': function() {
			var result = object.mixin({ a: sentinel }, null);
			assert.equals(result, { a: sentinel });
		}
	}

});

})(
	require('buster'),
	require('../../../lib/object')
);