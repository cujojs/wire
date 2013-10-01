/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function() {

	var thisLooksLikeCssRx, eventSplitterRx, undef;

	thisLooksLikeCssRx = /#|\.|-|[^,]\s[^,]/;
	eventSplitterRx = /\s*,\s*/;

	return {
		configure: createOn,
		splitEventSelectorString: splitEventSelectorString
	};

	function createOn(onImpl, options) {

		if(!options) {
			options = {};
		}

		return on;

		function on(eventString, node, handler) {
			var events, prevent, stop;

			events = splitEventSelectorString(eventString);
			prevent = options.preventDefault;
			stop = options.stopPropagation;

			return registerHandlers(events, node, handler, prevent, stop)
		}

		function registerHandlers (events, node, callback, prevent, stop) {
			return events.map(function(event) {
				var handler = makeEventHandler(callback, prevent, stop);
				return onImpl(node, event, handler, events.selector);
			});
		}

	}

	function preventDefaultIfNav (e) {
		var node, nodeName, nodeType, isNavEvent;
		node = e.selectorTarget || e.target || e.srcElement;
		if (node) {
			nodeName = node.tagName;
			nodeType = node.type && node.type.toLowerCase();
			// catch links and submit buttons/inputs in forms
			isNavEvent = ('click' == e.type && 'A' == nodeName)
				|| ('submit' == nodeType && node.form)
				|| ('submit' == e.type && 'FORM' == nodeName);
			if (isNavEvent) {
				preventDefaultAlways(e);
			}
		}
	}

	function preventDefaultAlways (e) {
		e.preventDefault();
	}

	function stopPropagationAlways (e) {
		e.stopPropagation();
	}

	function never () {}

	function makeEventHandler (handler, prevent, stop) {
		var preventer, stopper;
		preventer = prevent == undef || prevent == 'auto'
			? preventDefaultIfNav
			: prevent ? preventDefaultAlways : never;
		stopper = stop ? stopPropagationAlways : never;

		// Use proxy.invoke instead of trying to call methods
		// directly on proxy.target
		return function (e) {
			preventer(e);
			stopper(e);
			return handler.apply(this, arguments);
		};
	}

	/**
	 * Splits an event-selector string into one or more combinations of
	 * selectors and event types.
	 * Examples:
	 *   ".target:click" --> {selector: '.target', event: 'click' }
	 *   ".mylist:first-child:click, .mylist:last-child:click" --> [
	 *     { selector: '.mylist:first-child', event: 'click' },
	 *     { selector: '.mylist:last-child', event: 'click' }
	 *   ]
	 *   ".mylist:first-child, .mylist:last-child:click" --> {
	 *     selector: '.mylist:first-child, .mylist:last-child',
	 *     event: 'click'
	 *   }
	 * @private
	 * @param {string} eventString
	 * @param {string?} defaultSelector {String}
	 * @returns {Array} an array of event names. if a selector was specified
	 *   the array has a selectors {String} property
	 */
	function splitEventSelectorString (eventString, defaultSelector) {
		var split, events, selectors;

		// split on first colon to get events and selectors
		split = eventString.split(':', 2);
		events = split[0];
		selectors = split[1] || defaultSelector;

		// look for css stuff in event (dev probably forgot event?)
		// css stuff: hash, dot, spaces without a comma
		if (thisLooksLikeCssRx.test(events)) {
			throw new Error('on! resolver: malformed event-selector string (event missing?)');
		}

		// split events
		events = events.split(eventSplitterRx);
		if (selectors) {
			events.selector = selectors;
		}

		return events;
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
