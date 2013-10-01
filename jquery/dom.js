/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/jquery/dom plugin
 * jQuery-based dom! resolver
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['../lib/plugin-base/dom', 'jquery'], function(createDomPlugin, jquery) {

	return createDomPlugin({
		on: on,
		query: function (selector, root) {
			return jquery(selector, root).toArray();
		},
		first: function (selector, root) {
			return jquery(selector, root)[0];
		},
		addClass: function(node, cls) {
			jquery(node).addClass(cls);
		},
		removeClass: function(node, cls) {
			jquery(node).removeClass(cls);
		},
		placeAt: function (node, refNode, location) {
			var $refNode, $children;
			$refNode = jquery(refNode);
			// `if else` is more compressible than switch
			if (!isNaN(location)) {
				$children = $(refNode).children();
				if (location <= 0) {
					$refNode.prepend(node);
				}
				else if (location >= $children.length) {
					$refNode.append(node);
				}
				else {
					$children.eq(location).before(node);
				}
			}
			else if (location == 'at') {
				$refNode.empty().append(node);
			}
			else if (location == 'last') {
				$refNode.append(node);
			}
			else if (location == 'first') {
				$refNode.prepend(node);
			}
			else if (location == 'before') {
				$refNode.before(node);
			}
			else if (location == 'after') {
				$refNode.after(node);
			}
			else {
				throw new Error('Unknown dom insertion command: ' + location);
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
	 * @param [selector] {String} optional css query string to use to
	 */
	function on (node, event, handler /*, selector */) {
		var selector;

		selector = arguments[3];
		handler = makeEventHandler(handler, selector);

		if (selector) {
			jquery(node).on(event, selector, handler);
			return function () {
				jquery(node).off(event, selector, handler);
			}
		}
		else {
			jquery(node).on(event, handler);
			return function () {
				jquery(node).off(event, handler);
			}
		}
	}

	function makeEventHandler (handler, selector) {
		return function (e, o) {
			if (selector) e.selectorTarget = this;
			handler(e, o);
		}
	}

});
