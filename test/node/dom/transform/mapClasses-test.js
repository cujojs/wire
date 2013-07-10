(function(buster, mapClasses) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('dom/transform/mapClasses', {

	'when node provided': {
		'should call supplied mapper': function() {
			var mapper, replacer, mc, expected;

			expected = 'a';
			mapper = this.stub().returns('b');
			replacer = this.spy();

			mc = mapClasses({
				map: {},
				node: {},
				mapper: mapper,
				replacer: replacer
			});

			mc(expected);
			assert.calledOnceWith(mapper, expected);
		},

		'should call replacer with mapped classes': function() {
			var mapper, replacer, mc, expected;

			expected = 'b';
			mapper = this.stub().returns('b');
			replacer = this.spy();

			mc = mapClasses({
				map: {},
				node: {},
				mapper: mapper,
				replacer: replacer
			});

			mc('a');
			assert.calledOnceWith(replacer, expected);
		}
	},

	'when node not provided': {
		'should call supplied mapper': function() {
			var mapper, replacer, mc, expected;

			expected = 'a';
			mapper = this.stub().returns('b');
			replacer = this.spy();

			mc = mapClasses({
				map: {},
				mapper: mapper,
				replacer: replacer
			});

			mc({}, expected);
			assert.calledOnceWith(mapper, expected);
		},

		'should call replacer with node and mapped classes': function() {
			var mapper, replacer, mc, expected, node;

			expected = 'b';
			node = {};

			mapper = this.stub().returns('b');
			replacer = this.spy();

			mc = mapClasses({
				map: {},
				mapper: mapper,
				replacer: replacer
			});

			mc(node, 'a');
			assert.calledOnceWith(replacer, node, expected);
		}
	}

});
})(
	require('buster'),
	require('../../../../dom/transform/mapClasses')
);