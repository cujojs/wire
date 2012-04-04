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
define(['../plugin-base/on', 'dojo/on', 'dojo/query'], function(createOnPlugin, dojoOn) {

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
		var selector;

		selector = arguments[4];

		if (selector) {
			event = dojoOn.selector(selector, event);
		}

		return dojoOn(node, event, makeEventHandler(context, method, selector)).remove;
	}

	on.wire$plugin = createOnPlugin({
		on: on
	}).wire$plugin;

	return on;

	function makeEventHandler (context, method, selector) {
		return function (e) {
			if (selector) e.selectorTarget = this;
			context[method](e);
		}
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
));
