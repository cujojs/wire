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
	 *
	 * @param context {Object}
	 * @param funcs {Array}
	 * @return {Function}
	 */
	function compose(context, funcs) {
		// TODO: pull this out to a functional helper lib
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
	 * @param context {Object}
	 * @param composeString {String}
	 * @param resolveRef {Function}
	 * @return {Promise} a promise for the composed function
	 */
	function parseCompose(context, composeString, resolveRef) {
		var names, method;

		names = composeString.split(/\s*\|\s*/);
		method = names[names.length-1];
		names = names.slice(0, -1);

		if(!names.length) {
			return context[method];
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
				funcs.push(context[method]);
				return compose(context, funcs);
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
             * @param target target object
             * @param func target function to invoke
             */
            function doConnectOne(source, event, target, func) {
				if (typeof func == 'string') func = target[func];

                return aop.on(source, event, function() {
                    func.apply(target, arguments);
                });
            }

            function doConnect(target, connect, options, wire) {
                var source, eventName, methodName, promise, promises;

                // First, determine the direction of the connection(s)
                // If ref is a method on target, connect it to another object's method, i.e. calling a method on target
                // causes a method on the other object to be called.
                // If ref is a reference to another object, connect that object's method to a method on target, i.e.
                // calling a method on the other object causes a method on target to be called.
                if(typeof target[connect] == 'function') {
                    // Connecting from an event on the current component to a method on
                    // another component.  Set source = wiring target
                    source = target;
                    eventName = connect;

                    if(typeof options == 'string') {
                        target = options.split('.');
						// NOTE: This form does not yet support transforms
                        // eventName: 'componentName.methodName'

                        methodName = target[1];
                        target = target[0];

                        promise = when(wire.resolveRef(target), function(target) {
                            connectHandles.push(doConnectOne(source, eventName, target, methodName));
                        });
                    } else {
                        // eventName: {
                        //   componentName: 'methodName'
                        //   componentName: 'transform | methodName'
                        // }

                        promises = [];
                        for(connect in options) {

                            methodName = options[connect];
                            promise = when(wire.resolveRef(connect), function(target) {
								return when(parseCompose(target, methodName, wire.resolveRef),
									function(func) {
										connectHandles.push(doConnectOne(source, eventName, target, func));
									});
							});

                            promises.push(promise);
                        }

                        promise = when.all(promises);

                    }

                } else {
                    if(typeof options == 'string') {
                        // 'component.eventName': 'methodName'
                        // 'component.eventName': 'transform | methodName'

                        source = connect.split('.');
                        eventName = source[1];
                        source = source[0];
                        methodName = options;

                        promise = when(wire.resolveRef(source), function(source) {
							return when(parseCompose(target, methodName, wire.resolveRef),
								function(func) {
									connectHandles.push(doConnectOne(source, eventName, target, func));
								}
							)
                        });
                    } else {
                        // componentName: {
                        //   eventName: 'methodName'
                        //   eventName: 'transform | methodName'
                        // }

                        source = connect;
                        promise = when(wire.resolveRef(connect), function(source) {
							var promises = [];
                            for(eventName in options) {
								promises.push(when(parseCompose(target, options[eventName], wire.resolveRef),
									function(func) {
										connectHandles.push(doConnectOne(source, eventName, target, func));
									}
								));
                            }

							return when.all(promises);
                        });

                    }
                }

                return promise;
            }

            function connectFacet(wire, target, connects) {
                var connect, promises;

                promises = [];

                for(connect in connects) {
                    promises.push(doConnect(target, connect, connects[connect], wire));
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
                            when.chain(connectFacet(wire, facet.target, facet.options), resolver);
                        }
                    }
                }
            };
        }
    };
});
