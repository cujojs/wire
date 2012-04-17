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
define(['when', 'when/apply'], function (when, apply) {
"use strict";

	var theseAreNotEvents, undef;

	theseAreNotEvents = {
		selector: 1,
		transform: 1,
		preventDefault: 1,
		stopPropagation: 1
	};

	/**
	 *
	 * @param context {Object}
	 * @param funcs {Array}
	 * @return {Function}
	 */
	function compose(context, funcs) {
		return function composed(x) {
			var i, len, result;

			result = x;

			for(i = 0, len = funcs.length; i<len; i++) {
				result = funcs[i].call(context, result);
			}

			return result;
		};
	}

	return function createOnPlugin (options) {

		return {
			wire$plugin: function eventsPlugin (ready, destroyed, options) {

				var removers = [];

				if (!options) options = {};

				function parseOn (component, refName, connections, wire) {
					// First, figure out if the left-hand-side is a ref to
					// another component, or an event/delegation string
					return when(wire.resolveRef(refName),
						function (target) {
							// target is the node to which to connect, and
							// right hand side is a specification of an event
							// and a handler method on the current component
							/*
								component: {
									on: {
										otherComponent: {
											selector: 'a.nav',
											transform: { $ref: 'myTransformFunc' }, // optional
											click: 'handlerMethodOnComponent',
											keypress: 'anotherHandlerOnComponent'
										}
									}
								}
							 */
							var event, pairs, selector, prevent, stop, method, transform, promises, waitFor;

							promises = [];

							selector = connections.selector;
							transform = connections.transform;
							prevent = connections.preventDefault || options.preventDefault;
							stop = connections.stopPropagation || options.stopPropagation;
							for (event in connections) {
								// The 'selector' property name is reserved, so skip it
								if (!(event in theseAreNotEvents)) {
									pairs = splitEventSelectorString(event, selector);
									method = connections[event];
									checkHandler(component, method);

									if(transform) {
										// FIXME: This is pretty inefficient.  Should extract to a function
										// rather than using when.all to pass thru pairs and component[method]
										promises.push(when.all([pairs, component[method], wire(transform)],
											apply(function(pairs, method, transform) {
												var composed = compose(component, [transform, method]);
												removers = removers.concat(
													registerHandlers(pairs, target, component, composed, prevent, stop)
												);
											})
										));
									} else {
										removers = removers.concat(
											registerHandlers(pairs, target, component, method, prevent, stop)
										);
									}
								}
							}

							return when.all(promises);
						},
						function () {
							// Failed to resolve refName as a reference, assume it
							// is an event on the current component
							var pairs, prevent, stop, ref, method, promises, promise;

							// event/selector pairs
							pairs = splitEventSelectorString(refName);

							prevent = options.preventDefault;
							stop = options.stopPropagation;

							if (typeof connections == 'string') {
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
									checkHandler(ref, method);
									removers = removers.concat(
										registerHandlers(pairs, component, ref, method, prevent, stop)
									);
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

								for (ref in connections) {

									promises.push(when(wire.resolveRef(ref),
										function (resolved) {
											checkHandler(resolved, connections[ref]);
											removers = removers.concat(
												registerHandlers(pairs, component, resolved, connections[ref], prevent, stop)
											);
										}
									));
								}

								promise = when.all(promises);
							}

							return promise;
						}
					);

				}

				function onFacet (wire, target, connections) {
						var promises = [];

						for (var ref in connections) {
							promises.push(parseOn(target, ref, connections[ref], wire));
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
								when.chain(onFacet(wire, facet.target, facet.options), resolver);
							}
						}
					}
				};
			}
		};

		function registerHandlers (pairs, node, context, method, prevent, stop) {
			var removers, handler;
			removers = [];
			for (var i = 0, len = pairs.length; i < len; i++) {
				handler = makeEventHandler(context, method, prevent, stop);
				removers.push(options.on(node, pairs[i].event, undef, handler, pairs[i].selector));
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
			isNavEvent = 'click' == e.type
				&& 'A' == nodeName
				|| ('submit' == nodeType && node.form);
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

	function never (e) {}

	function makeEventHandler (context, method, prevent, stop) {
		var preventer, stopper;
		preventer = prevent == undef || prevent == 'auto'
			? preventDefaultIfNav
			: prevent ? preventDefaultAlways : never;
		stopper = stop ? stopPropagationAlways : never;

		// Support both:
		// if method is a string, use context[method]
		// if method is function, use it directly
		if(typeof method == 'string') method = context[method];

		return function (e) {
			preventer(e);
			stopper(e);
			return method.call(context, e);
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
