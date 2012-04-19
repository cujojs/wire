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

define(['when', 'when/apply', 'aop', './lib/functional'],
function(when, apply, aop, functional) {

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

							promise = when(functional.compose.parse(proxy, methodName, wire.resolveRef, wire.getProxy),
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
									promises.push(when(functional.compose.parse(proxy, options[eventName], wire.resolveRef, wire.getProxy),
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
						var promise, promises, target, methodSpec;

						eventName = connect;
						source = proxy.target;

						if(typeof options == 'string') {
							// NOTE: This form does not yet support transforms
							// eventName: 'transform | componentName.methodName'

							methodSpec = options;

							promise = when(functional.compose.parse(null, methodSpec, wire.resolveRef, wire.getProxy),
								function(func) {
									connectHandles.push(doConnectOne(source, eventName, proxy, func));
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
											connectHandles.push(doConnectOne(source, eventName, targetProxy, func));
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
