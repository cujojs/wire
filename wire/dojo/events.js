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
		wire$listeners: {
			onCreate: function(factory, object, spec) {
				if(typeof spec.connect == 'object') {
					connect(factory, object, spec.connect);
				}
			},
			onContextDestroy: function(target) {
				for (var i = connectHandles.length - 1; i >= 0; i--){
					events.disconnect(connectHandles[i]);
				};
			}
		}
	};
});