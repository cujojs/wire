/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom/base
 * provides basic dom creation capabilities for plugins.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(function () {

	var classRx, trimLeadingRx, getFirstTagNameRx, splitClassNamesRx,
		parentTypes, undef;

	classRx = '(\\s+|^)classNames(\\b(?![\\-_])|$)';
	trimLeadingRx = /^\s+/;
	getFirstTagNameRx = /<\s*(\w+)/;
	splitClassNamesRx = /(\b\s+\b)|\s+/;

	// elements that could be used as root elements and their natural parent type
	parentTypes = {
		'li': 'ul',
		'td': 'tr',
		'tr': 'tbody',
		'tbody': 'table',
		'thead': 'table',
		'tfoot': 'table',
		'caption': 'table',
		'col': 'table',
		'colgroup': 'table'
	};

	/**
	 * Adds one or more css classes to a dom element.
	 * @param el {HTMLElement}
	 * @param className {String} a single css class or several, space-delimited
	 *   css classes.
	 */
	function addClass (el, className) {
		var newClass;

		newClass = _stripClass(el.className, className);

		el.className = (newClass ? newClass + ' ' : '') + className;
	}

	/**
	 * Removes one or more css classes from a dom element.
	 * @param el {HTMLElement}
	 * @param className {String} a single css class or several, space-delimited
	 *   css classes.
	 */
	function removeClass (el, className) {
		el.className = _stripClass(el.className, className);
	}

	/**
	 * Adds or removes one or more css classes from a dom element.
	 * @param el {HTMLElement}
	 * @param className {String} a single css class or several, space-delimited
	 *   css classes.
	 */
	function toggleClass (el, className) {
		var unalteredClass;

		// save copy of what _stripClass would return if className
		// was not found
		unalteredClass = el.className.replace(trimLeadingRx, '');

		// remove className
		el.className = _stripClass(el.className, className);

		// add className if it wasn't removed
		if (unalteredClass == el.className) {
			el.className += ' ' + className;
		}
	}

	/**
	 * Super fast, one-pass, non-looping routine to remove one or more
	 * space-delimited tokens from another space-delimited set of tokens.
	 * @private
	 * @param tokens
	 * @param removes
	 */
	function _stripClass (tokens, removes) {
		var rx;

		if (!removes) return tokens;

		// convert space-delimited tokens with bar-delimited (regexp `or`)
		removes = removes.replace(splitClassNamesRx, function (m, inner, edge) {
			// only replace inner spaces with |
			return edge ? '' : '|';
		});

		// create one-pass regexp
		rx = new RegExp(classRx.replace('classNames', removes), 'g');

		// remove all tokens in one pass (wish we could trim leading
		// spaces in the same pass! at least the trim is not a full
		// scan of the string)
		return tokens.replace(rx, '').replace(trimLeadingRx, '');
	}

	/**
	 * Finds the first html element in a string, extracts its tag name,
	 * and looks up the natural parent element tag name for this element.
	 * @private
	 * @param template {String}
	 * @returns {String} the parent tag name, or 'div' if none was found.
	 */
	function getParentTagName (template) {
		var matches;

		// TODO: throw if no element was ever found?
		matches = template.match(getFirstTagNameRx);

		return parentTypes[matches && matches[1]] || 'div';
	}

	/**
	 * Creates an element from a text template.
	 * @private
	 * @param template {String}
	 * @param parentTagName {String}
	 * @returns {HTMLElement} the root element created from the template
	 */
	function createElementFromTemplate (template, parentTagName) {
		var parent, child;

		parent = document.createElement(parentTagName);
		parent.innerHTML = template;

		// just return first element (nodelists are tricky)
		child = parent.firstElementChild || parent.firstChild;

		while (child && child.nodeType != 1) {
			child = child.nextSibling;
		}

		return child;
	}

	/**
	 * Creates a DocumentFragment from an HTML template string and
	 * returns the first HTML element it finds in that string.
	 * @param template {String}
	 * @returns {HTMLElement}
	 */
	function elementFromTemplate (template) {
		return createElementFromTemplate(template, getParentTagName(template));
	}

	return {

		addClass: addClass,
		removeClass: removeClass,
		toggleClass: toggleClass,
		elementFromTemplate: elementFromTemplate

	};

});