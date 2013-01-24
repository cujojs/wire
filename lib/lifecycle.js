/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function(require) {

	var when, safeNonFacetNames;

	when = require('when');
	safeNonFacetNames = {
		id: { value: 1 }
	};

	function Lifecycle(config) {
		this._config = config;
	}

	Lifecycle.prototype = {
		init: createLifecyclePhase(['create', 'configure', 'initialize']),
		startup: createLifecyclePhase(['connect', 'ready']),
		shutdown: createLifecyclePhase(['destroy'])
	};

	return Lifecycle;

	/**
	 * Generate a method to process all steps in a lifecycle phase
	 * @return {Function}
	 */
	function createLifecyclePhase(steps) {
		steps = generateSteps(steps);

		return function(proxy) {
			var self, pluginApi;

			self = this;
			pluginApi = this._config.pluginApi.contextualize(proxy.id);

			return when.reduce(steps, function (unused, step) {
				return processFacets(step, proxy, pluginApi, self._config);
			}, proxy);
		};
	}

	function processFacets(step, proxy, api, config) {
		var promises, metadata, options, name, spec, facets, safeNames, unprocessed;

		promises = [];
		metadata = proxy.metadata;
		spec = metadata.spec;
		facets = config.plugins.facets;
		safeNames = Object.create(config.plugins.factories, safeNonFacetNames);
		unprocessed = [];

		for(name in spec) {
			if(name in facets) {
				options = spec[name];
				if (options) {
					processStep(promises, facets[name], step, proxy, options, api);
				}
			} else if (metadata && !metadata.isPlugin && !(name in safeNames)) {
				unprocessed.push(name);
			}
		}

		if(unprocessed.length) {
			return when.reject(unrecognizedFacets(proxy, unprocessed, spec));
		} else {
			return when.all(promises).then(function () {
				return processListeners(step, proxy, api, config);
			}).yield(proxy);
		}
	}

	function processListeners(step, proxy, api, config) {
		var listeners, listenerPromises;

		listeners = config.plugins.listeners;
		listenerPromises = [];

		for (var i = 0; i < listeners.length; i++) {
			processStep(listenerPromises, listeners[i], step, proxy, {}, api);
		}

		return when.all(listenerPromises);
	}

	function processStep(promises, processor, step, proxy, options, api) {
		var facet, pendingFacet;

		if (processor && processor[step]) {
			pendingFacet = when.defer();
			promises.push(pendingFacet.promise);

			facet = Object.create(proxy);
			facet.options = options;
			processor[step](pendingFacet.resolver, facet, api);
		}
	}

	function generateSteps(steps) {
		return steps.reduce(reduceSteps, []);
	}

	function reduceSteps(lifecycle, step) {
		lifecycle.push(step + ':before');
		lifecycle.push(step);
		lifecycle.push(step + ':after');
		return lifecycle;
	}

	function unrecognizedFacets(proxy, unprocessed, spec) {
		return new Error('unrecognized facets in ' + proxy.id + ', maybe you forgot a plugin? ' + unprocessed.join(', ') + '\n' + JSON.stringify(spec));
	}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(require); }
);