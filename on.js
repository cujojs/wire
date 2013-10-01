/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/on plugin
 * wire plugin that provides an "on" facet to connect to dom events,
 * and includes support for delegation
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function (define) {
define(function (require) {
"use strict";

	var when, functional, connection;

	when = require('when');
	functional = require('./lib/functional');
	connection = require('./lib/connection');

	return function onPlugin (options) {

		var removers = [];

		function createConnection(nodeProxy, eventsString, handler) {
			removers = removers.concat(nodeProxy.on(eventsString, handler));
		}

		function onFacet(wire, facet) {
			var promises, connects;

			connects = facet.options;
			promises = Object.keys(connects).map(function(key) {
				return connection.parse(
					facet, key, connects[key], wire, createConnection);
			});

			return when.all(promises);
		}

		return {
			context: {
				destroy: function(resolver) {
					removers.forEach(function(remover) {
						remover();
					});
					resolver.resolve();
				}
			},
			facets: {
				on: {
					connect: function (resolver, facet, wire) {
						resolver.resolve(onFacet(wire, facet));
					}
				}
			},
			resolvers: {
				on: function(resolver, name, refObj, wire) {
					resolver.resolve(createOnResolver(name, wire));
				}
			}
		};
	};

	/**
	 * Returns a function that creates event handlers.  The event handlers
	 * are pre-configured with one or more selectors and one
	 * or more event types.  The syntax is identical to the "on" facet.
	 * Note that the returned handler does not auto-magically call
	 * event.preventDefault() or event.stopPropagation() like the "on"
	 * facet does.
	 * @private
	 * @param eventSelector {String} event/selector string that can be
	 *   parsed by splitEventSelectorString()
	 * @return {Function} a function that can be used to create event
	 *   handlers. It returns an "unwatch" function and takes any of
	 *   the following argument signatures:
	 *     function (handler) {}
	 *     function (rootNode, handler) {}
	 */
	function createOnResolver (eventSelector, wire) {
		return function () {
			var args, target, handler, unwatches;

			// resolve arguments
			args = Array.prototype.slice.call(arguments, 0, 3);

			target = args.length > 1 ? wire.getProxy(args.shift()) : document;
			if(!eventSelector) {
				eventSelector = args.shift();
			}

			handler = args[0];

			unwatches = when(target, function(targetProxy) {
				return targetProxy.on(eventSelector, handler);
			});

			// return unwatcher of all events
			return function unwatch() {
				return unwatches.then(function(unwatches) {
					unwatches.forEach(function (unwatch) { unwatch(); });
				});
			};
		};
	}

});
}(typeof define == 'function' && define.amd ? define : function (factory) { module.exports = factory(require); }));
