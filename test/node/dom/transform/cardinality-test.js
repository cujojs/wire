(function(buster, cardinality) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

function fakeNode(classes) {
	return { className: classes||'' }
}

buster.testCase('dom/transform/cardinality', {

	'should map 0': function() {
		var c = cardinality();
		assert(c(fakeNode(), 0), 'zero');
	},

	'should map 1': function() {
		var c = cardinality();
		assert(c(fakeNode(), 1), 'one');
	},

	'should map many': function() {
		var c = cardinality();
		assert(c(fakeNode(), 2), 'many');
		assert(c(fakeNode(), 999), 'many');
	},

	'should use supplied string prefix': function() {
		var c = cardinality('test');
		assert(c(fakeNode(), 0), 'test-zero');
		assert(c(fakeNode(), 1), 'test-one');
		assert(c(fakeNode(), 2), 'test-many');
	},

	'should use supplied prefix': function() {
		var c = cardinality({ prefix: 'test' });
		assert(c(fakeNode(), 0), 'test-zero');
		assert(c(fakeNode(), 1), 'test-one');
		assert(c(fakeNode(), 2), 'test-many');
	},

	'should replace existing cardinality': function() {
		var c, node;

		c = cardinality();
		node = fakeNode('zero');

		assert(c(node, 1), 'one');
	},

	'should replace existing cardinality and preserve other existing classes': function() {
		var c, node;

		c = cardinality();
		node = fakeNode('foo zero bar');

		assert(c(node, 1), 'foo one bar');
	}

});
})(
	require('buster'),
	require('../../../../dom/transform/cardinality')
);