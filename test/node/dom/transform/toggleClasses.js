(function(buster, toggleClasses) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

function fakeNode(classes) {
	return { className: classes||'' }
}

// TODO: Add tests cases when both node AND classes are preconfigured

buster.testCase('dom/transform/toggleClasses', {

	'add': {
		'should add classes if not present': function() {
			var t = toggleClasses();
			assert.equals(t.add(fakeNode(), 'a').className, 'a');
		},

		'should not add duplicate classes': function() {
			var t = toggleClasses();
			assert.equals(t.add(fakeNode('a'), 'a').className, 'a');
		},

		'should preserve existing classes': function() {
			var t = toggleClasses();
			assert.match(t.add(fakeNode('b c'), 'a').className, /^(a\sb\sc)|(b\sc\sa)|(b\sa\sc)$/);
		},

		'when node is bound': {
			'should add class to bound node': function() {
				var n, t;
				n = fakeNode();
				t = toggleClasses({ node: n });

				assert.equals(t.add('a').className, 'a');
			}
		},

		'when classes are bound': {
			'should add bound classes': function() {
				var t = toggleClasses({ classes: 'a' });
				assert.equals(t.add(fakeNode()).className, 'a');
			}
		},

		'when node and classes are bound': {
			'should add bound classes to bound node': function() {
				var n, t;
				n = fakeNode();
				t = toggleClasses({ node: n, classes: 'a' });

				assert.equals(t.add().className, 'a');
			}
		}

	},

	'remove': {
		'should remove classes if present': function() {
			var t = toggleClasses();
			assert.equals(t.remove(fakeNode('a'), 'a').className, '');
		},

		'should be a noop if classes not present': function() {
			var t = toggleClasses();
			assert.equals(t.remove(fakeNode('a'), 'b').className, 'a');
		},

		'should preserve existing classes': function() {
			var t = toggleClasses();
			assert.match(t.remove(fakeNode('b a c'), 'a').className, /^(b\sc)|(c\sb)$/);
		},

		'when node is bound': {
			'should remove class from bound node': function() {
				var n, t;
				n = fakeNode('test');
				t = toggleClasses({ node: n });

				assert.equals(t.remove('test').className, '');
			}
		},

		'when classes are bound': {
			'should remove bound classes': function() {
				var t = toggleClasses({ classes: 'a' });
				assert.equals(t.remove(fakeNode('a')).className, '');
			}
		},

		'when node and classes are bound': {
			'should remove bound classes from bound node': function() {
				var n, t;
				n = fakeNode('a');
				t = toggleClasses({ node: n, classes: 'a' });

				assert.equals(t.remove().className, '');
			}
		}
	},

	'toggle': {
		'should add classes if not present': function() {
			var toggle = toggleClasses();
			assert.equals(toggle(fakeNode(), 'a').className, 'a');
		},

		'should remove classes if present': function() {
			var toggle = toggleClasses();
			assert.equals(toggle(fakeNode('a'), 'a').className, '');
		},

		'should preserve existing classes': function() {
			var n, toggle;

			n = fakeNode('b c');
			toggle = toggleClasses();

			assert.match(toggle(n, 'a').className, /^(a\sb\sc)|(b\sc\sa)|(b\sa\sc)$/);
			assert.match(toggle(n, 'a').className, /^(b\sc)|(c\sb)$/);
		},

		'when node is bound': {
			'should toggle class on bound node': function() {
				var n, toggle;

				n = fakeNode();
				toggle = toggleClasses({ node: n });

				assert.equals(toggle('a').className, 'a');
				assert.equals(toggle('a').className, '');
			}
		},

		'when classes are bound': {
			'should toggle bound classes': function() {
				var n, toggle;

				n = fakeNode();
				toggle = toggleClasses({ classes: 'a' });

				assert.equals(toggle(n).className, 'a');
				assert.equals(toggle(n).className, '');
			}
		},

		'when node and classes are bound': {
			'should toggle bound classes on bound node': function() {
				var n, toggle;

				n = fakeNode();
				toggle = toggleClasses({ node: n, classes: 'a' });

				assert.equals(toggle().className, 'a');
				assert.equals(toggle().className, '');
			}
		}

	}

});
})(
	require('buster'),
	require('../../../../dom/transform/toggleClasses')
);