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
define(['when'], function(when) {
	var testNode, eventSelectorRx, undef;

	eventSelectorRx = /\s*([^:]*)\s*:\s*([^:,]*)\s*(,?)/g;

	return function createOnPlugin(options) {

		return {
			wire$plugin: function eventsPlugin(ready, destroyed /*, options */) {

				var removers = [];

				function parseOn(component, refName, connections, wire) {
					// First, figure out if the left-hand-side is a ref to
					// another component, or an event/delegation string
					return when(wire.resolveRef(refName),
						function(target) {
							// target is the node to which to connect, and
							// right hand side is a specification of an event
							// and a handler method on the current component
							/*
								component: {
									on: {
										otherComponent: {
											selector: 'a.nav',
											click: 'handlerMethodOnComponent',
											keypress: 'anotherHandlerOnComponent'
										}
									}
								}
							 */
							var event, pairs, selector, method;

							selector = connections.selector;
							for(event in connections) {
								// The 'selector' property name is reserved, so skip it
								if(event != 'selector') {
									pairs = splitEventSelectorString(event, selector);
									method = connections[event];
									removers = removers.concat(registerHandlers(pairs, target, makeHandler(component, method)));
								}
							}
						},
						function() {
							// Failed to resolve refName as a reference, assume it
							// is an event on the current component
							var pairs, ref, method, promises, promise;

							// event/selector pairs
							pairs = splitEventSelectorString(refName);

							if(typeof connections == 'string') {
								/*
									component: {
										on: {
											event: 'otherComponent.handler'
										}
									}
								 */
								ref = connections.split('.');
								method = ref[1];
								ref = ref[0];

								promise = when(wire.resolveRef(ref), function(ref) {
									removers = removers.concat(registerHandlers(pairs, component, makeHandler(ref, method)));
								});
							} else {
								/*
									component: {
										on: {
											event: {
												component1: 'handlerOnComponent1',
												component2: 'handlerOnComponent2'
											}
										}
									}
								 */
								promises = [];

								for(ref in connections) {
									promises.push(when(wire.resolveRef(ref),
										function(resolved) {
											removers = removers.concat(registerHandlers(pairs, component, makeHandler(resolved, connections[ref])));
										}
									));
								}

								promise = when.all(promises);
							}

							return promise;
						}
					);

				}

				function onFacet(wire, target, connections) {
						var promises = [];

						for(var ref in connections) {
							promises.push(parseOn(target, ref, connections[ref], wire));
						}

						return when.all(promises);
				}

				destroyed.then(function onContextDestroy() {
					for (var i = removers.length - 1; i >= 0; i--) {
						removers[i]();
					}
				});

				return {
					facets: {
						on: {
							connect: function(resolver, facet, wire) {
								when.chain(onFacet(wire, facet.target, facet.options), resolver);
							}
						}
					}
				};
			}
		};

		function registerHandlers (pairs, node, handler) {
			var removers;
			removers = [];
			for (var i = 0, len = pairs.length; i < len; i++) {
				removers.push(options.on(node, pairs[i].event, handler, pairs[i].selector));
			}
			return removers;
		}

	};

	function makeHandler (obj, method) {

		// If the thing that's going to handle the event
		// isn't a method, fail loudly
		if(!obj) {
			throw new Error('on: Can\'t invoke ' + method + ' on : ' + obj);
		}
		else if(typeof obj[method] != 'function') {
			throw new Error('on: No such method: ' + method);
		}

		return function () {
			return obj[method].apply(obj, arguments);
		}
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
	 * @param string
	 * @returns {Array} selector/event pairs ({Object})
	 */
	function splitEventSelectorString (string, defaultSelector) {
		var pairs, selector, remainder;
		/* TODO: new syntax:
			event1,event2:selector1, selector2
		 */
		// ".mylist:first-child:click, .mylist:last-child:click"
		// ".mylist:first-child, .mylist:last-child:click"
		// ".watzit:empty, .watzit:disabled:click"
		// ".test-element:click"
		// "click"
		pairs = [];
		selector = '';
		remainder = string.replace(eventSelectorRx, function (m, pattern, event, comma) {
			// keep going until we find an event
			//if (!pattern) throw new Error('on: couldn\'t parse event/selector string: ' + string);
			if (event && isEventType(event)) {
				// got an event, save it and the selector
				pairs.push({ selector: (selector + pattern) || defaultSelector, event: event });
				selector = '';
			}
			else {
				// isn't an event. it is a pseudo-element
				selector += pattern + ':' + event + (comma || '');
			}
			return '';
		});
		if (remainder) {
			pairs.push({ event: remainder, selector: defaultSelector });
		}
		return pairs;
	}

	function isEventType (type) {
		if (!testNode) testNode = document.createElement('span');
		return ('on' + type) in testNode;
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
));
