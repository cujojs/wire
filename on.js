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

	/**
	 *
	 * @param node {HTMLElement} should this be a Node?
	 * @param event {String} event name ('click', mouseenter')
	 *   TODO: support multiple events and selectors
	 * @param handler {Function} function (e) {}
	 * @param [selector] {String} optional css query string to use to
	 */
	function on (node, event, handler /*, selector */) {
		var selector;

		selector = arguments[3];

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
			var target, matches, i, len;
			// if e.target matches the selector, call the handler
			target = e.target;
			matches = base.querySelectorAll(selector, node);
			for (i = 0, len = matches.length; i < len; i++) {
				if (target == matches[i]) {
					return handler(e);
				}
			}
		};
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
));
