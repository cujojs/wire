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

define(['when', 'aop', './lib/functional', './lib/connection'],
function(when, aop, functional, connection) {

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

			function handleConnection(source, eventName, targetProxy, func) {
				connectHandles.push(doConnectOne(source, eventName, targetProxy, func));
			}

            function doConnect(proxy, connect, options, wire) {
				return connection.parse(proxy, connect, options, wire, handleConnection);
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
