define(['dojo'], function(pubsub) {
	
	var subscribeHandles = [];

	function proxyPublish(target, publish) {
		for(var f in publish) {
			if(typeof target[f] == 'function') {
				var orig = target[f],
					topic = publish[f];
				
				target[f] = function publishProxy() {
					var result = orig.apply(target, arguments);
					pubsub.publish(topic, [result]);
					return result;
				};
			}
		}
	}
	
	function proxySubscribe(target, subscriptions) {
		for(var topic in subscriptions) {
			var f = subscriptions[topic];
			if(typeof target[f] == 'function') {
				// TODO: How to unsubscribe?
				subscribeHandles.push(pubsub.subscribe(topic, target, f));
			}
		}
	}

	return {
		wire$listeners: {
			onCreate: function(factory, object, spec) {
				if(typeof spec.publish == 'object') {
					proxyPublish(object, spec.publish);
				}

				if(typeof spec.subscribe == 'object') {
					proxySubscribe(object, spec.subscribe);
				}
			},
			onContextDestroy: function(target) {
				for (var i = subscribeHandles.length - 1; i >= 0; i--){
					pubsub.disconnect(subscribeHandles[i]);
				};
			}
		}
	};
});