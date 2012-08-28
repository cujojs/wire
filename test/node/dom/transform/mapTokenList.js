(function(buster, mapTokenList) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('dom/transform/mapTokenList', {

	'should return empty result for zero-length input': function() {
		var expected, mtl;

		expected = '';
		mtl = mapTokenList({ a: '1', b: '2' });

		assert.equals(mtl(expected), expected);
	},

	'should return empty result for empty input': function() {
		var expected, mtl;

		expected = '   ';
		mtl = mapTokenList({ a: '1', b: '2' });

		assert.equals(mtl(expected), expected);
	},

	'should allow undefined input': function() {
		var mtl = mapTokenList({ a: '1', b: '2' });
		assert.equals(mtl(), '');
	},

	'should allow null input': function() {
		var mtl = mapTokenList({ a: '1', b: '2' });
		assert.equals(mtl(), '');
	},

	'should map known tokens': function() {
		var mtl = mapTokenList({ a: '1', b: '2' });
		assert.equals(mtl('a b'), '1 2');
	},

	'should use fallback for unknown tokens': function() {
		var mtl = mapTokenList({ a: '1', b: '2' });
		assert.equals(mtl('a c b'), '1 2');
	},

	'should use supplied fallback when provided': function() {
		var mtl = mapTokenList({ a: '1', b: '2' }, { otherwise: '3' });
		assert.equals(mtl('a b c'), '1 2 3');
	}


});
})(
	require('buster'),
	require('../../../../dom/transform/mapTokenList')
);