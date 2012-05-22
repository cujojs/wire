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
define(['when', 'when/apply', '../functional', '../connection'],
function (when, apply, functional, connection) {
"use strict";

	var theseAreNotEvents, undef;

	theseAreNotEvents = {
		selector: 1,
		transform: 1,
		preventDefault: 1,
		stopPropagation: 1
	};

	return function createOnPlugin (options) {

		return {
			wire$plugin: function eventsPlugin (ready, destroyed, options) {

				var removers = [];

				if (!options) options = {};

				function parseIncomingOn(source, targetProxy, connections, wire) {

					// NOTE: Custom parsing for incoming connections

					// target is the node to which to connect, and
					// right hand side is a specification of an event
					// and a handler method on the current component
					//
					//	component: {
					//		on: {
					//			otherComponent: {
					//				selector: 'a.nav',
					//				transform: { $ref: 'myTransformFunc' }, // optional
					//				click: 'handlerMethodOnComponent',
					//				keypress: 'anotherHandlerOnComponent'
					//			}
					//		}
					//	}
					var target, event, pairs, selector, prevent, stop, method, transform, promises;

					target = targetProxy.target;
					promises = [];

					// Extract options
					selector = connections.selector;
					transform = connections.transform;
					prevent = connections.preventDefault || options.preventDefault;
					stop = connections.stopPropagation || options.stopPropagation;

					/**
					 * Compose a transform pipeline and then pass it to addConnection
					 */
					function createTransformedConnection(pairs, targetMethod, transformPromise) {
						return when(transformPromise, function(transform) {
							var composed = functional.compose([transform, targetMethod], targetProxy.target);
							addConnection(pairs, source, targetProxy, composed);
						});
					}

					/**
					 * Create and save the new DOM handler connection so it can
					 * be disconnected later.
					 */
					function addConnection(pairs, source, proxy, func) {
						removers = removers.concat(
							registerHandlers(pairs, source, proxy, func, prevent, stop)
						);
					}

					for (event in connections) {
						// Skip reserved names, such as 'selector'
						if (!(event in theseAreNotEvents)) {
							pairs = splitEventSelectorString(event, selector);
							method = connections[event];
							checkHandler(target, method);

							// If there's a transform, compose a transform pipeline
							// otherwise, use the target method directly
							if(transform) {
								promises.push(createTransformedConnection(pairs, target[method], wire(transform)));
							} else {
								addConnection(pairs, source, targetProxy, method);
							}
						}
					}

					return when.all(promises);
				}

				function parseOn (proxy, refName, connections, wire) {
					// First, figure out if the left-hand-side is a ref to
					// another component, or an event/delegation string
					return when(wire.resolveRef(refName),
						function (source) {
							// It's an incoming connection, parse it as such
							return parseIncomingOn(source, proxy, connections, wire)
						},
						function () {
							// Failed to resolve refName as a reference, assume it
							// is an outgoing event with the current component (which
							// must be a Node) as the source
							return connection.parseOutgoing(proxy, refName, connections, wire, createConnection);

							function createConnection(source, eventsString, targetProxy, targetMethod) {
								var pairs, prevent, stop;

								// event/selector pairs
								pairs = splitEventSelectorString(eventsString);
								prevent = options.preventDefault;
								stop = options.stopPropagation;

								removers = removers.concat(
									registerHandlers(pairs, source, targetProxy, targetMethod, prevent, stop)
								);
							}
						}
					);

				}

				function onFacet (wire, facet) {
					var promises, connections;

					connections = facet.options;
					promises = [];

					for (var ref in connections) {
						promises.push(parseOn(facet, ref, connections[ref], wire));
					}

					return when.all(promises);
				}

				destroyed.then(function onContextDestroy () {
					for (var i = removers.length - 1; i >= 0; i--) {
						removers[i]();
					}
				});

				return {
					facets: {
						on: {
							connect: function (resolver, facet, wire) {
								when.chain(onFacet(wire, facet), resolver);
							}
						}
					}
				};
			}
		};

		function registerHandlers (pairs, node, targetProxy, method, prevent, stop) {
			var removers, handler;
			removers = [];
			for (var i = 0, len = pairs.length; i < len; i++) {
				handler = makeEventHandler(targetProxy, method, prevent, stop);
				removers.push(options.on(node, pairs[i].event, handler, pairs[i].selector));
			}
			return removers;
		}

	};

	function checkHandler (obj, method) {

		// If the thing that's going to handle the event
		// isn't a method, fail loudly
		if (!obj) {
			throw new Error('on: Can\'t invoke ' + method + ' on : ' + obj);
		}
		else if (typeof obj[method] != 'function') {
			throw new Error('on: No such method: ' + method);
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

	function makeEventHandler (proxy, method, prevent, stop) {
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
			return proxy.invoke(method, [e]);
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
	 * @param string {String}
	 * @param defaultSelector {String}
	 * @returns {Array} selector/event pairs ({Object})
	 */
	function splitEventSelectorString (string, defaultSelector) {
		var split, events, selectors, pairs;

		// split on first colon to get events and selectors
		split = string.split(':', 2);
		events = split[0];
		selectors = split[1];

		// split events
		events = events.split(',');

		// create pairs
		pairs = [];
		while (events.length) {
			pairs.push({
				event: events.shift(),
				selector: selectors || defaultSelector
			});
		}

		return pairs;
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (deps, factory) { module.exports = factory.apply(this, deps.map(require)); }
));
