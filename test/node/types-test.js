(function(buster, wire) {
"use strict";

var assert, refute, fail, toString;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

toString = Object.prototype.toString;

function collectKeys(object) {
	var allKeys = [];
	for(var p in object) {
		allKeys.push(p);
	}

	return allKeys;
}

buster.testCase('types', {

	'Object literal': {
		'should be supported': function() {
			return wire({ a: {} }).then(
				function(context) {
					assert.isObject(context.a);
				}
			);
		},

		'should have clean prototype': function() {
			return wire({ a: {} }).then(
				function(context) {
					assert.equals(collectKeys(context.a), collectKeys({}));
				}
			);
		}
	},

	'Array': {
		'should be supported': function() {
			return wire({ a: [1, 2, 3] }).then(
				function(context) {
					assert.isArray(context.a);
					assert.equals(context.a, [1, 2, 3]);
				}
			);
		},

		'should support Array()': function() {
			return wire({ a: new Array() }).then(
				function(context) {
					assert.isArray(context.a);
				}
			);
		}
	},

	'Number': {
		'should be supported': function() {
			return wire({ a: 1 }).then(
				function(context) {
					assert.isNumber(context.a);
					assert.equals(context.a, 1);
				}
			);
		}
	},

	'String': {
		'should be supported': function() {
			return wire({ a: "a", b: new String() }).then(
				function(context) {
					assert.isString(context.a);
					assert.equals(context.a, "a");
				}
			);
		},

		'should support String()': function() {
			return wire({ a: new String('a') }).then(
				function(context) {
					assert.equals(toString.call(context.a), '[object String]');
					assert.equals(context.a, "a");
				}
			);
		}
	},

	'Date': {
		'should be supported': function() {
			return wire({ a: new Date() }).then(
				function(context) {
					assert.equals(toString.call(context.a), '[object Date]');
				}
			);
		}
	},

	'RegExp': {
		'should be supported': function() {
			return wire({ a: /a/ }).then(
				function(context) {
					assert.equals(toString.call(context.a), '[object RegExp]');
				}
			);
		},

		'should support RegExp()': function() {
			return wire({ a: new RegExp('b') }).then(
				function(context) {
					assert.equals(toString.call(context.a), '[object RegExp]');
				}
			);
		}
	},

	'Boolean': {
		'should be supported': function() {
			return wire({ a: true, b: false }).then(
				function(context) {
					assert.equals(typeof context.a, 'boolean');
					assert.equals(typeof context.b, 'boolean');
				}
			);
		},

		'should support Boolean()': function() {
			return wire({ a: new Boolean(true) }).then(
				function(context) {
					assert.equals(toString.call(context.a), '[object Boolean]');
					assert.equals(context.a, true);
				}
			);
		}
	}

});

})(
	require('buster'),
	require('../../wire')
);