/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/connect plugin
 * wire plugin that can connect synthetic events (method calls) on one
 * component to methods of another object.  For example, connecting a
 * view's onClick event (method) to a controller's _handleViewClick method:
 *
 * view: {
 *     create: 'myView',
 *     ...
 * },
 * controller: {
 *     create: 'myController',
 *     connect: {
 *         'view.onClick': '_handleViewClick'
 *     }
 * }
 *
 * It also supports arbitrary transforms on the data that flows over the
 * connection.
 *
 * transformer: {
 *     module: 'myTransformFunction'
 * },
 * view: {
 *     create: 'myView',
 *     ...
 * },
 * controller: {
 *     create: 'myController',
 *     connect: {
 *         'view.onClick': 'transformer | _handleViewClick'
 *     }
 * }
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['when', 'when/apply', 'aop'], function(when, apply, aop) {


	/**
	 * Compose functions
	 * @param funcs {Array} array of functions to compose
	 * @param context {Object} context on which to invoke each function in the composition
	 * @return {Function} composed function
	 */
	function compose(funcs, context) {
		return function composed(x) {
			var i, len, result;

			result = x;

			for(i = 0, len = funcs.length; i<len; i++) {
				result = funcs[i].call(context, result);
			}

			return result;
		};
	}

	/**
	 * Parses the function composition string, resolving references as needed, and
	 * composes a function from the resolved refs.
	 * @param proxy {Object} wire proxy on which to invoke the final method of the composition
	 * @param composeString {String} function composition string
	 *  of the form: 'transform1 | transform2 | ... | methodOnProxyTarget"
	 * @param resolveRef {Function} function to use is resolving references, returns a promise
	 * @return {Promise} a promise for the composed function
	 */
	function parseCompose(proxy, composeString, resolveRef) {
		var names, method;

		names = composeString.split(/\s*\|\s*/);
		method = names[names.length-1];
		names = names.slice(0, -1);

		function last() {
			return proxy.invoke(method, arguments);
		}

		// Optimization: If there are no transforms to apply, just return
		// the final call to the target proxy method
		if(!names.length) {
			return last;
		}

		// First, resolve each transform function, stuffing it into an array
		// The result of this reduce will an array of concrete functions
		// Then add the final context[method] to the array of funcs and
		// return the composition.
		return when.reduce(names, function(funcs, functionRef) {
			return when(resolveRef(functionRef), function(func) {
				funcs.push(func);
				return funcs;
			});
		}, []).then(
			function(funcs) {
				funcs.push(last);
				return compose(funcs, proxy.target);
			}
		);
	}

	return {
        wire$plugin: function eventsPlugin(ready, destroyed /*, options */) {

            var connectHandles = [];

            /**
             * Create a single connection from source[event] to target[method] so that
             * when source[event] is invoked, target[method] will be invoked afterward
             * with the same params.
             *
             * @param source source object
             * @param event source method
             * @param targetProxy {Object} proxied target
             * @param func target function to invoke
             */
            function doConnectOne(source, event, targetProxy, func) {
                return aop.on(source, event, function() {
					targetProxy.invoke(func, arguments);
                });
            }

            function doConnect(proxy, connect, options, wire) {
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
						var promise, methodName;

						if(eventName) {
							// 'component.eventName': 'methodName'
							// 'component.eventName': 'transform | methodName'

							methodName = options;

							promise = when(parseCompose(proxy, methodName, wire.resolveRef),
									function(func) {
										connectHandles.push(doConnectOne(source, eventName, proxy, func));
									}
								);

						} else {
							// componentName: {
							//   eventName: 'methodName'
							//   eventName: 'transform | methodName'
							// }

							source = connect;
							promise = when(wire.resolveRef(connect), function(source) {
								var promises = [];
								for(eventName in options) {
									promises.push(when(parseCompose(proxy, options[eventName], wire.resolveRef),
										function(func) {
											connectHandles.push(doConnectOne(source, eventName, proxy, func));
										}
									));
								}

								return when.all(promises);
							});
						}

						return promise;

					},
					function() {
						var promise, promises, target, methodName;

						eventName = connect;
						source = proxy.target;

						if(typeof options == 'string') {
							// NOTE: This form does not yet support transforms
							// eventName: 'componentName.methodName'

							target = options.split('.');
							methodName = target[1];
							target = target[0];

							promise = when(wire.getProxy(target), function(targetProxy) {
								connectHandles.push(doConnectOne(source, eventName, targetProxy, methodName));
							});

						} else {
							// eventName: {
							//   componentName: 'methodName'
							//   componentName: 'transform | methodName'
							// }
							promises = [];
							for(connect in options) {

								methodName = options[connect];
								promise = when(wire.getProxy(connect), function(target) {
									return when(parseCompose(target, methodName, wire.resolveRef),
										function(func) {
											connectHandles.push(doConnectOne(source, eventName, target, func));
										});
								});

								promises.push(promise);
							}

							promise = when.all(promises);

						}
					}
				);
            }

            function connectFacet(wire, facet) {
                var connect, promises, connects;

				connects = facet.options;

                promises = [];

                for(connect in connects) {
                    promises.push(doConnect(facet, connect, connects[connect], wire));
                }

                return when.all(promises);
            }

            destroyed.then(function onContextDestroy() {
                for (var i = connectHandles.length - 1; i >= 0; i--){
                    connectHandles[i].remove();
                }
            });

            return {
                facets: {
                    connect: {
                        connect: function(resolver, facet, wire) {
                            when.chain(connectFacet(wire, facet), resolver);
                        }
                    }
                }
            };
        }
    };
});
