/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function(require) {

	var when, timeout, object, DirectedGraph, findStronglyConnected;

	when = require('when');
	timeout = require('when/timeout');
	object = require('./object');
	DirectedGraph = require('./graph/DirectedGraph');
	findStronglyConnected = require('./graph/tarjan');

	function Resolver(config) {
		this._resolvers = config.plugins.resolvers;
		this._pluginApi = config.pluginApi;

		this._refGraph = new DirectedGraph();
	}

	Resolver.prototype = {

		isRef: function(it) {
			return it && object.hasOwn(it, '$ref');
		},

		parse: function(it) {
			return this.create(it.$ref, it);
		},

		create: function(name, options) {
			var self, split, resolver, refGraph;

			self = this;

			split = name.indexOf('!');
			resolver = name.substring(0, split);
			name = name.substring(split + 1);
			refGraph = this._refGraph;

			return {
				resolver: resolver,
				name: name,
				options: options,
				resolve: function(fallback, onBehalfOf) {
					var ref = this.resolver
						? self._resolve(resolver, name, options, onBehalfOf)
						: fallback(name, options);

					return  trackInflightRef(ref, refGraph, name, onBehalfOf);
				}
			};
		},

		_resolve: function(resolverName, name, options, onBehalfOf) {
			var deferred, resolver, api;

			deferred = when.defer();
			api = this._pluginApi.contextualize(onBehalfOf);

			if (resolverName) {
				resolver = this._resolvers[resolverName];

				if (resolver) {
					resolver(deferred.resolver, name, options||{}, api);
				} else {
					deferred.reject(new Error('No resolver plugin found: ' + resolverName));
				}

			} else {
				deferred.reject(new Error('Cannot resolve ref: ' + name));
			}

			return deferred.promise;
		}
	};

	return Resolver;

	function trackInflightRef(refPromise, refGraph, refName, onBehalfOf) {

		refGraph.addEdge(onBehalfOf||'?', refName);

		return timeout(refPromise, 5e3).then(
			function(resolved) {
				refGraph.removeEdge(onBehalfOf||'?', refName);
				return resolved;
			},
			function() {
				var stronglyConnected, cycles;

				stronglyConnected = findStronglyConnected(refGraph);
				cycles = stronglyConnected.filter(function(node) {
					return node.length > 1;
				});

				if(cycles.length) {
					// Cycles detected
					throw new Error('Possible circular refs:\n'
						+ formatCycles(cycles));
				}

				return refPromise;
			}
		);
	}

	function formatCycles(cycles) {
		return cycles.map(function (sc) {
			return '[' + sc.map(function (v) {
					return v.name;
				}
			).reverse().join(' -> ') + ']';
		}).join(',');
	}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(require); }
);