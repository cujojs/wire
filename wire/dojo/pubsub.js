/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: events.js
	wire plugin that sets up subscriptions and topics to be published after
	functions are invoked.  ,
	and disconnect them when an object is destroyed.  This implementation uses
	dojo.connect and dojo.disconnect to do the work of connecting and disconnecting
	event handlers.
*/
define(['dojo'], function(pubsub) {

	return {
		wire$wire: function onWire(ready, destroy) {

			var destroyHandlers = [];

			/*
				Function: proxyPublish
				Proxies methods on target so that they publish topics after being
				invoked.  The payload of a topic will be the return value of the method
				that triggered it.

				Parameters:
					target - object whose methods should be proxied
					publish - hash of method names to topics each should publish
			*/
			function proxyPublish(target, publish) {
				var originals = {};

				for(var f in publish) {
					if(typeof target[f] == 'function') {
						var orig = originals[f] = target[f],
							topic = publish[f];

						target[f] = function publishProxy() {
							var result = orig.apply(target, arguments);
							pubsub.publish(topic, [result]);
						};
					}
				}

				destroyHandlers.push(function() {
					unproxyPublish(target, originals);
				});
			}

			/*
				Function: unproxyPublish
				Restores the original functions on object after they've been proxied
				by <proxyPublish> to publish topics.

				Parameters:
					object - object whose methods should be restored
					originals - hash of method names to original methods to restore
			*/
			function unproxyPublish(object, originals) {
				for(var p in originals) {
					object[p] = originals[p];
				}
			}

			function subscribeTarget(target, subscriptions) {
				var subscribeHandles = [];
				for(var topic in subscriptions) {
					var f = subscriptions[topic];
					if(typeof target[f] == 'function') {
						// TODO: How to unsubscribe?
						subscribeHandles.push(pubsub.subscribe(topic, target, f));
					}
				}

				if(subscribeHandles.length > 0) {
					destroyHandlers.push(function() {
						unsubscribeTarget(subscribeHandles);
					});
				}
			}

		    function unsubscribeTarget(handles) {
		        for (var i = handles.length - 1; i >= 0; i--){
					pubsub.unsubscribe(handles[i]);
				}
			}
			
			ready.then(null, null,
				function onObject(progress) {
					if(progress.status === 'init') {
						var spec = progress.spec;
					
						if(typeof spec.publish == 'object') {
							proxyPublish(progress.target, spec.publish);
						}

						if(typeof spec.subscribe == 'object') {
							subscribeTarget(progress.target, spec.subscribe);
						}
					}
				}
			);
			
			destroy.then(function onContextDestroy() {
				for (var i = destroyHandlers.length - 1; i >= 0; i--){
					destroyHandlers[i]();
                }
            });
		}
	};
});