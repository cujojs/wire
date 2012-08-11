(function(buster, toggleClasses) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

function fakeNode(classes) {
	return { className: classes||'' }
}

// TODO: Add tests cases when node and/or classes are preconfigured

buster.testCase('dom/transform/toggleClasses', {

	'add': {
		'should add classes if not present': function() {
			var t = toggleClasses();
			assert.equals(t.add(fakeNode(), 'test').className, 'test');
		},

		'should not add duplicate classes': function() {
			var t = toggleClasses();
			assert.equals(t.add(fakeNode(), 'test').className, 'test');
		}
	},

	'remove': {
		'should remove classes if present': function() {
			var t = toggleClasses();
			assert.equals(t.remove(fakeNode('test'), 'test').className, '');
		},

		'should be a noop if classes not present': function() {
			var t = toggleClasses();
			assert.equals(t.remove(fakeNode('a'), 'b').className, 'a');
		}
	},

	'toggle': {
		'should add classes if not present': function() {
			var t = toggleClasses();
			assert.equals(t(fakeNode(), 'a').className, 'a');
		},

		'should remove classes if present': function() {
			var t = toggleClasses();
			assert.equals(t(fakeNode('a'), 'a').className, '');
		}
	}

});
})(
	require('buster'),
	require('../../../../dom/transform/toggleClasses')
);