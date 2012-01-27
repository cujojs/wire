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
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['when', 'aop'], function(when, aop) {

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
             * @param method target method
             */
            function doConnectOne(source, event, target, method) {
                return aop.on(source, event, function() {
                    target[method].apply(target, arguments);
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
                        // eventName: 'componentName.methodName'

                        methodName = target[1];
                        target = target[0];

                        promise = when(wire.resolveRef(target), function(target) {
                            connectHandles.push(doConnectOne(source, eventName, target, methodName));
                        });
                    } else {
                        // eventName: {
                        //   componentName: 'methodName'
                        // }

                        promises = [];
                        for(connect in options) {

                            methodName = options[connect];
                            promise = when(wire.resolveRef(connect), function(target) {
                                connectHandles.push(doConnectOne(source, eventName, target, methodName));
                            });

                            promises.push(promise);
                        }

                        promise = when.all(promises);

                    }

                } else {
                    if(typeof options == 'string') {
                        // 'component.eventName': 'methodName'

                        source = connect.split('.');
                        eventName = source[1];
                        source = source[0];
                        methodName = options;

                        promise = when(wire.resolveRef(source), function(source) {
                            connectHandles.push(doConnectOne(source, eventName, target, methodName))
                        });
                    } else {
                        // componentName: {
                        //   eventName: 'methodName'
                        // }

                        source = connect;
                        promise = when(wire.resolveRef(connect), function(source) {
                            for(eventName in options) {
                                connectHandles.push(doConnectOne(source, eventName, target, options[eventName]));
                            }
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
                        ready: function(resolver, facet, wire) {
                            when.chain(connectFacet(wire, facet.target, facet.options), resolver);
                        }
                    }
                }
            };
        }
    };
});
