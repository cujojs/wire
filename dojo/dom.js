/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dojo/dom plugin
 * Plugin that adds dom query resolver that uses dojo.query
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['../lib/plugin-base/dom', 'dojo', 'dojo/on', 'dojo/query'], function(createDomPlugin, dojo, dojoOn) {

	return createDomPlugin({
		on: on,
		byId: dojo.byId,
		query: dojo.query,
		first: function () {
			return dojo.query.apply(dojo, arguments)[0];
		},
		addClass: dojo.addClass,
		removeClass: dojo.removeClass,
		placeAt: function (node, refNode, location) {
			var i;
			if ('length' in refNode) {
				for (i = 0; i < refNode.length; i++) {
					dojo.place(i == 0 ? node : node.cloneNode(true), refNode[i], location);
				}
			}
			else {
				dojo.place(node, refNode, location);
			}
			return node;
		}
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
	 *   have the following signature: function (e) {}
	 */
	function on (node, event, handler /*, selector */) {
		var selector;

		selector = arguments[3];

		if (selector) {
			event = dojoOn.selector(selector, event);
		}

		// dojo's lite selector relies on node.getAttribute, which will fail if
		// node is document.  So, substitute documentElement instead.
		if(node === document) node = document.documentElement;

		return dojoOn(node, event, makeEventHandler(handler, selector)).remove;
	}

	function makeEventHandler (handler, selector) {
		return function (e) {
			if (selector) e.selectorTarget = this;
			return handler(e);
		}
	}

});