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
		wire$wire: function onWire(ready, destroy) {
			ready.then(null, null,
				function onObject(progress) {
					if(progress.status === 'init') {
						var spec = progress.spec;
					
						if(typeof spec.publish == 'object') {
							proxyPublish(progress.target, spec.publish);
						}

						if(typeof spec.subscribe == 'object') {
							proxySubscribe(progress.target, spec.subscribe);
						}
					}
				}
			);
			
			destroy.then(function onContextDestroy() {
				for (var i = connectHandles.length - 1; i >= 0; i--){
					pubsub.disconnect(subscribeHandles[i]);
				}
			});
		}
	};
});