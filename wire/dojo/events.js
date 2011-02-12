/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */
define(['dojo'], function(events) {
	
	var connectHandles = [];
	
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