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

define(['when', 'dojo/on', 'dojo/query'], function(when, on) {

	return {
		wire$plugin: function eventsPlugin(ready, destroyed /*, options */) {

			var handles = [];

			function makeEventHandler(context, method) {
				return function(e) {
					context[method](e);
				}
			}

			function addOn(target, eventSelector, handlerComponent, handlerMethod) {
				handles.push(
					on(
						target,
						eventSelector,
						makeEventHandler(handlerComponent, handlerMethod)
					)
				);
			}

			function parseOn(component, refName, connections, wire) {
				// First, figure out if the left-hand-side is a ref to
				// another component, or an event/delegation string
				return when(wire.resolveRef(refName),
					function(target) {
						// target is the node to which to connect, and
						// right hand side is a specification of an event
						// and a handler method on the current component
						var event, selector, method;

						selector = connections.selector;
						for(event in connections) {

							// The 'selector' property name is reserved, so skip it
							if(event != 'selector') {
								method = connections[event];

								// If the thing that's going to handle the event
								// isn't a method, fail loudly
								if(!typeof component[method] == 'function')
									throw new Error('No such method: ' + method);

								addOn(target, selector ? on.selector(selector, event) : event, component, connections[event]);
							}
						}
					},
					function() {
						// Failed to resolve refName as a reference, assume it
						// is an event on the current component
						var event, ref, method, promises, promise;

						event = refName;

						if(typeof connections == 'string') {
							ref = connections.split('.');
							method = ref[1];
							ref = ref[0];

							promise = when(wire.resolveRef(ref), function(ref) {
								addOn(component, event, ref, method);
							});
						} else {
							promises = [];

							for(ref in connections) {
								promises.push(when(wire.resolveRef(ref),
									function(resolved) {
										addOn(component, event, resolved, connections[ref]);
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
				for (var i = handles.length - 1; i >= 0; i--) {
					handles[i].remove();
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
});