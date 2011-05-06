/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: events.js
	wire plugin that can connect event handlers after an object is initialized,
	and disconnect them when an object is destroyed.  This implementation uses
	dojo.connect and dojo.disconnect to do the work of connecting and disconnecting
	event handlers.
*/
define(['dojo', 'dojo/_base/event'], function(events) {
	
	return {
		wire$plugin: function eventsPlugin(ready, destroyed, options) {
			
			var connectHandles = [];

			/*
				Function: connect
				Setup connections for each specified in the connects param.  Each key
				in connects is a reference, and the corresponding value is an object
				whose keys are event names, and whose values are methods of object to
				invoke.  For example:
				connect: {
					"dom!myButton": {
						"onclick": "_handleButtonClick"
					},
					"dijit!myWidget": {
						"onChange": "_handleValueChange"
					},
					"otherObject": {
						"onWhatever": "_handleWhatever"
					}
				}

				Parameters:
					factory - wiring factory
					object - object being wired, will be the target of connected events
					connects - specification of events to connect, see examples above.
			*/
			function connect(wire, target, connects) {
				for(var ref in connects) {
					(function(ref, c) {
						var eventName;
						// If ref is a method on target, connect it to another object's method, i.e. calling a method on target
						// causes a method on the other object to be called.
						// If ref is a reference to another object, connect that object's method to a method on target, i.e.
						// calling a method on the other object causes a method on target to be called.
						if(typeof target[ref] == 'function') {
							eventName = ref;
							for(ref in c) {
								wire.resolveRef(ref).then(function(resolved) {
									connectHandles.push(events.connect(target, eventName, resolved, c[ref]));
								});
							}
						} else {
							wire.resolveRef(ref).then(function(resolved) {
								for(eventName in c) {
									connectHandles.push(events.connect(resolved, eventName, target, c[eventName]));
								}
							});							
						}
					})(ref, connects[ref]);
				}
			}
			
			destroyed.then(function onContextDestroy() {
				for (var i = connectHandles.length - 1; i >= 0; i--){
					events.disconnect(connectHandles[i]);
				}
			});

			return {
				facets: {
					connect: {
						ready: function(promise, facet, wire) {
							connect(wire, facet.target, facet.options);
							promise.resolve();
						}
					}
				}
			};
		}
	};
});