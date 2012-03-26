/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dojo/events plugin
 * wire plugin that can connect event handlers after an object is
 * initialized, and disconnect them when an object is destroyed.
 * This implementation uses dojo.connect and dojo.disconnect to do
 * the work of connecting and disconnecting event handlers.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['when', 'dojo', 'dojo/_base/event'], function(when, events) {

	return {
		wire$plugin: function eventsPlugin(ready, destroyed, options) {
			
			var connectHandles = [];

			function connect(target, ref, options, wire) {
				var eventName, promise, promises;

                promises = [];

				// If ref is a method on target, connect it to another object's method, i.e. calling a method on target
				// causes a method on the other object to be called.
				// If ref is a reference to another object, connect that object's method to a method on target, i.e.
				// calling a method on the other object causes a method on target to be called.
				if(typeof target[ref] == 'function') {
					eventName = ref;
					for(ref in options) {
						promise = wire.resolveRef(ref).then(function(resolved) {
							connectHandles.push(events.connect(target, eventName, resolved, options[ref]));
						});

                        promises.push(promise);
					}

                    promise = when.all(promises);

				} else {
					promise = wire.resolveRef(ref).then(function(resolved) {
						for(eventName in options) {
							connectHandles.push(events.connect(resolved, eventName, target, options[eventName]));
						}
					});							
				}

                return promise;
			}
			
			/*
				Function: connectFacet
				Setup connections for each specified in the connects param.  Each key
				in connects is a reference, and the corresponding value is an object
				whose keys are event names, and whose values are methods of object to
				invoke.  For example:
				connect: {
					"refToOtherThing": {
						"eventOrMethodOfOtherThing": "myOwnMethod"
					},
					"dom!myButton": {
						"onclick": "_handleButtonClick"
					},
					"dijit!myWidget": {
						"onChange": "_handleValueChange"
					}

					"myOwnEventOrMethod": {
						"refToOtherThing": "methodOfOtherThing"
					}
				}

				Parameters:
					factory - wiring factory
					object - object being wired, will be the target of connected events
					connects - specification of events to connect, see examples above.
			*/
			function connectFacet(wire, target, connects) {
                var promises = [];

				for(var ref in connects) {
					promises.push(connect(target, ref, connects[ref], wire));
				}

                return when.all(promises);
			}
			
			destroyed.then(function onContextDestroy() {
				for (var i = connectHandles.length - 1; i >= 0; i--){
					events.disconnect(connectHandles[i]);
				}
			});

			return {
				facets: {
					connect: {
						connect: function(resolver, facet, wire) {
                            when.chain(connectFacet(wire, facet.target, facet.options), resolver);
						}
					}
				}
			};
		}
	};
});