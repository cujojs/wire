// deoends on gent, which does not work with AMD modules
if(typeof exports !== 'undefined') {

(function(define){define(function(require){
(function(buster, moduleId) {
	'use strict';

	var assert, refute, fail, gent,
		word, nonEmptyNormalizedId, pluginId, dotsOnly, idWithLeadingDots, undef;

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

	pluginId = gent.string(
		3, gent.sequence([
			gent.pick([idWithLeadingDots, nonEmptyNormalizedId]),
			'!',
			gent.pick([idWithLeadingDots, nonEmptyNormalizedId])
		])
	);

	function isNormalizedId(id) {
		return id === '' || /^(\w+\/)*\w+$/.test(id);
	}

	function isNormalizedPluginId(id) {
		return id === '' || /^(\w+\/)*\w+!(\w+\/)*\w+$/.test(id);
	}

	buster.testCase('lib/loader/id', {
		resolve: {
			'should generate normalized ids': function() {
				var id = gent.pick([idWithLeadingDots, nonEmptyNormalizedId, '']);

				assert.claim(function (base, id) {
					return isNormalizedId(moduleId.resolve(base, id));
				}, nonEmptyNormalizedId, id);
			},

			'should normalize plugin ids': function() {
				var id = pluginId;

				assert.claim(function (base, id) {
					return isNormalizedPluginId(moduleId.resolve(base, id));
				}, nonEmptyNormalizedId, id);
			},

			'should return base when id is falsy or .': function() {
				var id = gent.sequence([gent.falsy(), '', '.', './']);

				assert.claim(function (base, id) {
					return moduleId.resolve(base, id) === base;
				}, nonEmptyNormalizedId, id);
			},

			'should return id when id is not relative': function() {
				assert.claim(function (base, id) {
					return moduleId.resolve(base, id) === id;
				}, nonEmptyNormalizedId, nonEmptyNormalizedId);
			},

			'should return base when id is only leading dots': function() {
				assert.claim(function (id) {
					return moduleId.resolve('', id) === '';
				}, dotsOnly);
			}
		},

		base: {
			'should return empty string for falsy': function() {
				assert.claim(function(x) {
					return moduleId.base(x) === '';
				}, gent.falsy());
			},

			'should return base id': function() {
				assert.claim(function(x) {
					var base = moduleId.base(x);
					return isNormalizedId(base) && base.length < x.length;
				}, nonEmptyNormalizedId);
			}
		}

	});

})(
	require('buster'),
	require('../../../../lib/loader/moduleId'),
	require('gent/test-adapter/buster')
);
});})(typeof define !== 'undefined' ? define : function(fac){module.exports = fac(require);});

}
