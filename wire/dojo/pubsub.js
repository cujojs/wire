define(['dojo'], function(pubsub) {

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
		var handles = [];
		for(var topic in subscriptions) {
			var f = subscriptions[topic];
			if(typeof target[f] == 'function') {
				// TODO: How to unsubscribe?
				handles.push(pubsub.subscribe(topic, target, f));
			}
		}
	}

	return {
		wire$listeners: {
			onCreate: function(target, spec, resolver) {
				if(typeof spec.publish == 'object') {
					proxyPublish(target, spec.publish);
				}

				if(typeof spec.subscribe == 'object') {
					proxySubscribe(target, spec.subscribe);
				}
			},
			onDestroy: function(target) {
				console.log("PUBSUB destroy", target);
			}
		}
	};
});