(function(buster, replaceClasses) {
"use strict";

var assert, refute, fail, groupClasses;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

function fakeNode(classes) {
	return { className: classes||'test' }
}

function hasClassName (node, className) {
	var rx = new RegExp('(^|\\s)' + className + '($|\\s)');
	return rx.test(node.className);
}

groupClasses = 'foo-mode bar-mode edit-rights view-rights delete-rights simple-one simple-two simple-three';

buster.testCase('dom/transform/replaceClasses', {

	setUp: function() {
		this.node = fakeNode();
	},

	'should not fail from falsey values': function() {
		var replacer = replaceClasses({ node: this.node });

		refute.exception(function() {
			replacer();
			replacer('');
			replacer(null);
		});
	},

	'should add class when not already present': function() {
		var replacer = replaceClasses({ node: this.node });

		replacer('foo-mode');
		assert(/\bfoo-mode\b/.test(this.node.className));
	},

	'should not create leading or trailing whitespace': function() {
		var replacer = replaceClasses({
			node: this.node,
			group: groupClasses
		});

		replacer('foo-mode edit-rights yukkity-yuk');
		refute(/^\s|\s$/.test(this.node.className));
		replacer('foo-mode');
		refute(/^\s|\s$/.test(this.node.className));
		replacer('');
		refute(/^\s|\s$/.test(this.node.className));
	},

	'should not remove existing class names': function() {
		var replacer = replaceClasses({
			node: this.node,
			group: groupClasses
		});

		replacer('foo-mode');
		assert(hasClassName(this.node, 'foo-mode'));
	},

	'should add multiple classes in group': function() {
		var replacer = replaceClasses({ node: this.node, group: groupClasses });

		replacer('delete-rights edit-rights');
		assert(hasClassName(this.node, 'delete-rights'));
		assert(hasClassName(this.node, 'edit-rights'));
	},

	'should remove entire group when providing blank': function() {
		var replacer = replaceClasses({ node: this.node, group: groupClasses });

		replacer('foo-mode edit-rights');
		replacer('');

		refute(hasClassName(this.node, 'foo-mode'));
		refute(hasClassName(this.node, 'edit-rights'));
	},

	'should use previous classes when no group': function() {
		this.node.className = 'a';
		var replacer = replaceClasses({ node: this.node });

		replacer('foo-mode');
		assert(hasClassName(this.node, 'foo-mode'), 'added className');
		replacer('');
		refute(hasClassName(this.node, 'foo-mode'), 'removed className');
		assert(hasClassName(this.node, 'a'), 'removed className');
	},

	'should accept node when not configured': function() {
		var node, replacer;

		node = fakeNode();
		replacer = replaceClasses({});

		replacer(node, 'foo-mode');
		assert(hasClassName(node, 'foo-mode'), 'added className');
		replacer(node, '');
		refute(hasClassName(node, 'foo-mode'), 'removed className');
	}

});
})(
	require('buster'),
	require('../../../../dom/transform/replaceClasses')
);