/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dojo/on plugin
 * wire plugin that provides an "on" facet that uses dojo/on (dojo 1.7
 * and later) to connect to dom events, and includes support for delegation
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function (define) {
define(['./plugin-base/on', './dom/base'], function (createOnPlugin, base) {
"use strict";

	var contains;

	/**
	 * Listens for dom events at the given node.  If a selector is provided,
	 * events are filtered to only nodes matching the selector.  Note, however,
	 * that children of the matching nodes can also fire events that bubble.
	 * To determine the matching node, use the event object's selectorTarget
	 * property instead of it's target property.
	 * @param node {HTMLElement} element at which to listen
	 * @param event {String} event name ('click', 'mouseenter')
	 * @param context {Object} component on which to call method
	 * @param method {String} name of method on context. Method should
	 *   have the following signature: function (e) {}
	 * @param [selector] {String} optional css query string to use to
	 */
	function on (node, event, context, method /*, selector */) {
		var selector, handler;

		selector = arguments[4];
		handler = makeEventHandler(context, method);

		if (selector) {
			handler = filteringHandler(node, selector, handler);
		}

		node.addEventListener(event, handler, false);

		return function remove () {
			node.removeEventListener(node, handler, false);
		};
	}

	on.wire$plugin = createOnPlugin({
		on: on
	}).wire$plugin;

	if (document && document.compareDocumentPosition) {
		contains = function w3cContains (refNode, testNode) {
			return refNode.compareDocumentPosition(testNode) == 8;
		}
	}
	else {
		contains = function oldContains (refNode, testNode) {
			return refNode.contains(testNode);
		}
	}

	return on;

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

	function makeEventHandler (context, method, selector) {
		if (typeof method == 'string') method = context[method];
		return function (e) {
			method.call(context, e);
		}
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
));
