/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom plugin
 * wire plugin that provides a resource resolver for dom nodes, by id, in the
 * current page.  This allows easy wiring of page-specific dom references into
 * generic components that may be page-independent, i.e. makes it easier to write
 * components that can be used on multiple pages, but still require a reference
 * to one or more nodes on the page.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(function(require) {

	var createDomPlugin, base, contains;

	createDomPlugin = require('./lib/plugin-base/dom');
	base = require('./lib/dom/base');

	contains = document && document.compareDocumentPosition
		? function w3cContains(refNode, testNode) {
			return (refNode.compareDocumentPosition(testNode) & 16) == 16;
		}
		: function oldContains(refNode, testNode) {
			return refNode.contains(testNode);
		};

	return createDomPlugin({
		addClass: base.addClass,
		removeClass: base.removeClass,
		on: on
	});

	/**
	 * Listens for dom events at the given node.  If a selector is provided,
	 * events are filtered to only nodes matching the selector.  Note, however,
	 * that children of the matching nodes can also fire events that bubble.
	 * To determine the matching node, use the event object's selectorTarget
	 * property instead of it's target property.
	 * @param node {HTMLElement} element at which to listen
	 * @param event {String} event name ('click', 'mouseenter')
	 * @param handler {Function} handler function with the following signature: function (e) {}
	 * @param [selector] {String} optional css query string to use to
	 * @return {Function} removes the event handler
	 */
	function on (node, event, handler /*, selector */) {
		var selector = arguments[3];

		if (selector) {
			handler = filteringHandler(node, selector, handler);
		}

		node.addEventListener(event, handler, false);

		return function remove () {
			node.removeEventListener(node, handler, false);
		};
	}

	/**
	 * This is a brute-force method of checking if an event target
	 * matches a query selector.
	 * @private
	 * @param node {Node}
	 * @param selector {String}
	 * @param handler {Function} function (e) {}
	 * @returns {Function} function (e) {}
	 */
	function filteringHandler (node, selector, handler) {
		return function (e) {
			var target, matches, i, len, match;
			// if e.target matches the selector, call the handler
			target = e.target;
			matches = base.querySelectorAll(selector, node);
			for (i = 0, len = matches.length; i < len; i++) {
				match = matches[i];
				if (target == match || contains(match, target)) {
					e.selectorTarget = match;
					return handler(e);
				}
			}
		};
	}
});