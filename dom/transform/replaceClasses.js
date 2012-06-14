(function (define) {
define(function () {
"use strict";

	var removeRxParts, trimLeadingRx, splitClassNamesRx;

	removeRxParts = ['(\\s+|^)(', ')(\\b(?![\\-_])|$)'];
	trimLeadingRx = /^\s+/;
	splitClassNamesRx = /(\b\s+\b)|(\s+)/g;

	/**
	 * Configures a transform function that satisfies the most common
	 * requirement for oocss states: while adding new classes, it removes
	 * classes in the same group of states. This allows the dev to add
	 * and remove classes in the same atomic action.
	 * @param node {HTMLElement}
	 * @param [options] {Object} a hashmap of options
	 * @param [options.group] {Array|String} If specified, this is a list of
	 *   all possible classes in the group.  If a single string is
	 *   provided, it should be a space-delimited (TokenList) of classes.
	 * @param [options.initial] {Array|String} If specified, this is the
	 *   initial set of classes to set on the element.  This isn't just a
	 *   convenience feature: it may be necessary for this transform to work
	 *   correctly if not specifying a group.  See the description.
	 *
	 * @description
	 * If the group param is provided, all of the class names in the group
	 * will be removed from the element when new classes are added. A group
	 * is a set of classes that always change together (e.g. "can-edit
	 * can-delete can-view can-add" or "form-enabled form-disabled"). A
	 * group could consist of several groups at once as long as the classes
	 * for those groups are always set together, as well.
	 * If the group param is omitted, group behavior can still be achieved
	 * under most circumstances. As long as the transform function is always
	 * used on the same group (or set of groups)*, an algorithm that removes
	 * the previously set classes also works fine. (*It is possible to
	 * set classes that are not specified within the configured group.)
	 *
	 * @example 1: groups is a string
	 *   oocssSetter = configureReplaceClassNames(viewNode, {
	 *     group: 'edit-mode readonly-mode'
	 *   });
	 *   // later:
	 *   oocssSetter('edit-mode'); // viewNode.className == 'edit-mode';
	 *   // even later:
	 *   oocssSetter('readonly-mode'); // viewNode.className == 'readonly-mode';
	 *
	 * @example 2: groups is an array
	 *   oocssSetter = configureReplaceClassNames(viewNode, {
	 *     group: ['edit-mode', 'readonly-mode']
	 *   });
	 *
	 * @example 3: multiple groups at once
	 *   oocssSetter = configureReplaceClassNames(viewNode, {
	 *     group: ['edit-mode readonly-mode form-enabled form-disabled']
	 *   });
	 *   // later, be sure to set both groups at once:
	 *   oocssSetter('edit-mode form-enabled');
	 *
	 * @example 4: no group specified
	 *   oocssSetter = configureReplaceClassNames(viewNode, {
	 *     initial: 'form-disabled'
	 *   });
	 *   // later:
	 *   oocssSetter('form-enabled'); // form-disabled is removed
	 *
	 * @example 5: extra classes not in a group
	 *   oocssSetter = configureReplaceClassNames(viewNode, {
	 *     group: ['edit-mode readonly-mode']
	 *   });
	 *   // later (this is problematic if you didn't specify a group!)
	 *   oocssSetter('edit-mode error-in-form');
	 */
	return function configureReplaceClasses (options) {
		var prev = '', removeRx = '', group;

		if (!options) options = {};

		group = options.group;

		if (group) {
			// convert from array
			group = typeof group.join == 'function'
				? group.join('|')
				: group.replace(splitClassNamesRx, '|');
			// set up the regexp to remove everything in the group
			removeRx = new RegExp(removeRxParts.join(group), 'g');
		}

		if (options.initial) {
			// set the original classes
			replaceClasses(options.initial);
		}

		function replaceClasses (classes) {
			var node, leftovers;

			node = options.node || this;

			if (!classes) classes = '';

			// if there were previous classes set, remove them and current ones
			if (prev) {
				if (classes) prev += ' ' + classes;
				removeRx = new RegExp(removeRxParts.join(prev.replace(/\s+/g, '|')), 'g');
			}
			// there were likely classes we didn't remove (outside of group)
			leftovers = node.className.replace(removeRx, '')
				.replace(trimLeadingRx, '');

			// save this set for next time (if we're not using a group)
			if (!group) prev = classes;

			// assemble new classes
			classes = classes + (classes && leftovers ? ' ' : '') + leftovers;

			return node.className = classes;
		}

		return replaceClasses;

	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (deps, factory) { module.exports = factory(deps.map(require)); }
));
