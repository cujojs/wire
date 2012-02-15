/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dojo/pubsub plugin
 * wire plugin that sets up subscriptions and topics to be published after
 * functions are invoked, and disconnect them when an object is destroyed.
 * This implementation uses dojo.publish, dojo.subscribe and dojo.unsubscribe
 * to do the work of connecting and disconnecting event handlers.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['dojo', 'aop', 'dojo/_base/connect'], function(pubsub, aop) {

	return {
		wire$plugin: function pubsubPlugin(ready, destroyed, options) {

			var destroyHandlers = [];

			/**
			 * Proxies methods on target so that they publish topics after
			 * being invoked.  The payload of a topic will be the return
			 * value of the method that triggered it.
			 * @param target {Object} object whose methods should be proxied
			 * @param publish {Object} hash of method names to topics each should publish
			 */
			function proxyPublish(target, publish) {
				var remove;
				for(var f in publish) {
					if(typeof target[f] == 'function') {
						(function(f) {
							// Add after advice and save remove function to remove
							// advice when this context is destroyed
							remove = aop.after(target, f, function (result) {
								pubsub.publish(publish[f], [result]);
							});
						})(f);
						destroyHandlers.push(remove);
					}
				}
			}

			function subscribeTarget(target, subscriptions) {
				var subscribeHandles = [];
				for(var topic in subscriptions) {
					var f = subscriptions[topic];
					if(typeof target[f] == 'function') {
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
				for (var i = handles.length - 1; i >= 0; --i){
					pubsub.unsubscribe(handles[i]);
				}
			}

			// When the context is destroyed, remove all publish and
			// subscribe hooks created in this context
			destroyed.then(function onContextDestroy() {
				for (var i = destroyHandlers.length - 1; i >= 0; --i){
					destroyHandlers[i]();
				}
			});

			return {
				facets: {
					publish: {
						ready: function(promise, facet, wire) {
							proxyPublish(facet.target, facet.options);
							promise.resolve();
						}
					},
					subscribe: {
						ready: function(promise, facet, wire) {
							subscribeTarget(facet.target, facet.options);
							promise.resolve();
						}
					}
				}
			}
		}
	};
});