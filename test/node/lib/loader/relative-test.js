(function(buster, relative) {
	'use strict';

	var assert, refute, fail, gent,
		word, nonEmptyNormalizedId, dotsOnly, idWithLeadingDots;

	gent = require('gent');

	assert = buster.assert;
	refute = buster.refute;
	fail = buster.fail;

	word = gent.string(gent.integer(1, 10), gent.char('a', 'z'));

	nonEmptyNormalizedId = gent.string(
		gent.integer(1, 10),
		gent.string(3, gent.sequence([word, '/', word]))
	);

	dotsOnly = gent.string(
		gent.integer(1, 10),
		gent.pick(['../', './'])
	);

	idWithLeadingDots = gent.string(
		2, gent.sequence([dotsOnly, nonEmptyNormalizedId])
	);

	function isNormalizedId(id) {
		return id === '' || /^(\w+\/)*\w+$/.test(id);
	}

	buster.testCase('lib/loader/relative', {
		'should create a function': function() {
			assert.isFunction(relative(function() {}, ''));
		},

		'should call parent loader with normalized ids': function() {
			var id = gent.pick([idWithLeadingDots, nonEmptyNormalizedId, '']);
			assert.claim(function (base, id) {
				// isNormalizedId is acting as a parent loader spy
				var loader = relative(isNormalizedId, base);
				return loader(id);
			}, nonEmptyNormalizedId, id);
		},

		'should load module given a relative id': function() {
			// Given a *module id* (*not* a directory, and module does
			// not need to exist for this test), load another module
			// relative to it.
			var loader = relative(require, '../../../../foo');

			// Ensure we use a relative module id that cannot be
			// loaded by the local platform require
			assert.isFunction(loader('./test/node/fixtures/function'));
		}

	});

})(
	require('buster'),
	require('../../../../lib/loader/relative')
);