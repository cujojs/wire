(function(buster, Resolver) {
'use strict';

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('lib/resolver', {

	'isRef': {
		'should allow own $ref': function() {
			assert(new Resolver().isRef({ $ref: '' }));
		},

		'should not allow inherited $ref': function() {
			refute(new Resolver().isRef(Object.create({ $ref: '' })));
		},

		'should not allow missing $ref': function() {
			refute(new Resolver().isRef({}));
		},

		'should not allow null': function() {
			refute(new Resolver().isRef(null));
			refute(new Resolver().isRef());
		}
	}

});

})(
	require('buster'),
	require('../../../lib/resolver')
);