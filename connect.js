/** @license MIT License (c) copyright 2011-2013 original author or authors */

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
 *
 * @author Brian Cavalier
 * @author John Hann
 */

(function(define) { 'use strict';
define(function(require) {

	var when, meld, functional, connection;

	when = require('when');
	meld = require('meld');
	functional = require('./lib/functional');
	connection = require('./lib/connection');

	return function connectPlugin(/* options */) {

		var connectHandles = [];

		function handleConnection(sourceProxy, methodName, handler) {
			connectHandles.push(meld.on(sourceProxy.target, methodName, handler));
		}

		function doConnect(proxy, connect, options, wire) {
			return connection.parse(proxy, connect, options, wire, handleConnection);
		}

		function connectFacet(wire, facet) {
			var promises, connects;

			connects = facet.options;
			promises = Object.keys(connects).map(function(key) {
				return doConnect(facet, key, connects[key], wire);
			});

			return when.all(promises);
		}

		return {
			context: {
				destroy: function(resolver) {
					connectHandles.forEach(function(handle) {
						handle.remove();
					});
					resolver.resolve();
				}
			},
			facets: {
				// A facet named "connect" that runs during the connect
				// lifecycle phase
				connect: {
					connect: function(resolver, facet, wire) {
						resolver.resolve(connectFacet(wire, facet));
					}
				}
			}
		};
    };
});
}(typeof define == 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

