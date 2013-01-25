/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function(require) {

	var when, timeout, object, DirectedGraph, findStronglyConnected, refCycleCheckTimeout;

	when = require('when');
	timeout = require('when/timeout');
	object = require('./object');
	DirectedGraph = require('./graph/DirectedGraph');
	findStronglyConnected = require('./graph/tarjan');

	refCycleCheckTimeout = 5000;

	/**
	 * Create a reference resolve that uses the supplied plugins and pluginApi
	 * @param {object} config
	 * @param {object} config.plugins plugin registry
	 * @param {object} config.pluginApi plugin Api to provide to resolver plugins
	 *  when resolving references
	 * @constructor
	 */
	function Resolver(config) {
		this._resolvers = config.plugins.resolvers;
		this._pluginApi = config.pluginApi;

		// Directed graph to track reference cycles
		this._refGraph = new DirectedGraph();
	}

	Resolver.prototype = {

		/**
		 * Determine if it is a reference spec that can be resolved by this resolver
		 * @param {*} it
		 * @return {boolean} true iff it is a reference
		 */
		isRef: function(it) {
			return it && object.hasOwn(it, '$ref');
		},

		/**
		 * Parse it, which must be a reference spec, into a reference object
		 * @param {object} it
		 * @return {object} reference object
		 */
		parse: function(it) {
			return this.create(it.$ref, it);
		},

		/**
		 * Creates a reference object
		 * @param {string} name reference name
		 * @param {object} options
		 * @return {{resolver: String, name: String, options: object, resolve: Function}}
		 */
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

		/**
		 * Do the work of resolving a reference using registered plugins
		 * @param {string} resolverName plugin resolver name (e.g. "dom"), the part before the "!"
		 * @param {string} name reference name, the part after the "!"
		 * @param {object} options additional options to pass thru to a resolver plugin
		 * @param {string|*} onBehalfOf some indication of another component on whose behalf this
		 *  reference is being resolved.  Used to build a reference graph and detect cycles
		 * @return {object} promise for the resolved reference
		 * @private
		 */
		_resolve: function(resolverName, name, options, onBehalfOf) {
			var deferred, resolver, api;

			deferred = when.defer();

			if (resolverName) {
				api = this._pluginApi.contextualize(onBehalfOf);
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

	/**
	 * Add this reference to the reference graph, and setup a timeout that will fire if the refPromise
	 * has not resolved in a reasonable amount.  If the timeout fires, check the current graph for cycles
	 * and fail wiring if we find any.
	 * @param {object} refPromise promise for reference resolution
	 * @param {DirectedGraph} refGraph graph to use to track cycles
	 * @param {string} refName reference being resolved
	 * @param {string} onBehalfOf some indication of another component on whose behalf this
	 *  reference is being resolved.  Used to build a reference graph and detect cycles
	 * @return {object} promise equivalent to refPromise but that may be rejected if cycles are detected
	 */
	function trackInflightRef(refPromise, refGraph, refName, onBehalfOf) {

		refGraph.addEdge(onBehalfOf||'?', refName);

		return timeout(refPromise, refCycleCheckTimeout).then(
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

	/**
	 * If there are cycles, format them for output
	 * @param {Array} cycles array of reference resolution cycles
	 * @return {String} formatted string
	 */
	function formatCycles(cycles) {
		return cycles.map(function (sc) {
			return '[' + sc.map(function (v) {
					return v.name;
				}
			).join(', ') + ']';
		}).join(', ');
	}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(require); }
);