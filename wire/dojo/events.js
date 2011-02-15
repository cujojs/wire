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
define(['dojo'], function(events) {
	
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
	function connect(factory, object, connects) {
		var handles = [];
		for(var ref in connects) {
			(function(ref, c) {
				factory.resolveRef({ $ref: ref }).then(function(target) {
					for(var eventName in c) {
						events.connect(target, eventName, object, c[eventName]);
					}
				});
			})(ref, connects[ref]);
		}
	}

	return {
		wire$wire: function onWire(ready, destroy) {
			ready.then(null, null,
				function onObject(progress) {
					if(progress.status === 'init') {
						var c = progress.spec.connect;
						if(typeof c == 'object') {
							connect(progress.factory, progress.target, c);
						}
					}
				}
			);
			
			destroy.then(function onContextDestroy() {
				for (var i = connectHandles.length - 1; i >= 0; i--){
					events.disconnect(connectHandles[i]);
				}
			});
		}
	};
});