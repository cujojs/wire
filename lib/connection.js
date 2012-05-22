/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(['when', './functional'], function(when, functional) {
	"use strict";

	function parseIncoming(source, eventName, targetProxy, connect, options, wire, handleConnection) {
		var promise, methodName;

		if(eventName) {
			// 'component.eventName': 'methodName'
			// 'component.eventName': 'transform | methodName'

			methodName = options;

			promise = when(functional.compose.parse(targetProxy, methodName, wire.resolveRef, wire.getProxy),
				function(func) {
					handleConnection(source, eventName, targetProxy, func);
				}
			);

		} else {
			// componentName: {
			//   eventName: 'methodName'
			//   eventName: 'transform | methodName'
			// }

			source = methodName;
			promise = when(wire.resolveRef(connect), function(source) {
				var promises = [];
				for(eventName in options) {
					promises.push(when(functional.compose.parse(targetProxy, options[eventName], wire.resolveRef, wire.getProxy),
						function(func) {
							handleConnection(source, eventName, targetProxy, func);
						}
					));
				}

				return when.all(promises);
			});
		}

		return promise;

	}

	function parseOutgoing(source, eventName, targetProxy, connect, options, wire, handleConnection) {
		var promise, promises, methodSpec;

		eventName = connect;
		source = targetProxy.target;

		if(typeof options == 'string') {
			// eventName: 'transform | componentName.methodName'

			methodSpec = options;

			promise = when(functional.compose.parse(targetProxy, methodSpec, wire.resolveRef, wire.getProxy),
				function(func) {
					handleConnection(source, eventName, targetProxy, func);
				});

		} else {
			// eventName: {
			//   componentName: 'methodName'
			//   componentName: 'transform | methodName'
			// }
			promises = [];
			for(connect in options) {

				methodSpec = options[connect];
				promise = when(wire.getProxy(connect), function(targetProxy) {
					return when(functional.compose.parse(targetProxy, methodSpec, wire.resolveRef, wire.getProxy),
						function(func) {
							handleConnection(source, eventName, targetProxy, func);
						});
				});

				promises.push(promise);
			}

			promise = when.all(promises);

		}

		return promise;
	}

	function parse(proxy, connect, options, wire, handleConnection) {
		var source, eventName;

		// First, determine the direction of the connection(s)
		// If ref is a method on target, connect it to another object's method, i.e. calling a method on target
		// causes a method on the other object to be called.
		// If ref is a reference to another object, connect that object's method to a method on target, i.e.
		// calling a method on the other object causes a method on target to be called.

		source = connect.split('.');
		eventName = source[1];
		source = source[0];

		return when(wire.resolveRef(source),
			function(source) {
				return parseIncoming(source, eventName, proxy, connect, options, wire, handleConnection);
			},
			function() {
				return parseOutgoing(proxy.target, connect, proxy, connect, options, wire, handleConnection);
			}
		);
	}

	return {
		parse: parse
	};

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(deps, factory) {
		module.exports = factory.apply(this, deps.map(function(x) {
			return require(x);
		}));
	}
);