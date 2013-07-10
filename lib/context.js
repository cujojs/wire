/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */
(function(define){ 'use strict';
define(function(require) {

	var when, mixin, loaderAdapter, relativeLoader, Container;

	when = require('when');
	mixin = require('./object').mixin;
	loaderAdapter = require('./loader/adapter');
	relativeLoader = require('./loader/relative');
	Container = require('./Container');

	/**
	 * Creates a new context from the supplied specs, with the supplied
	 * parent context. If specs is an {Array}, it may be a mixed array
	 * of string module ids, and object literal specs.  All spec module
	 * ids will be loaded, and then all specs will be merged from
	 * left-to-right (rightmost wins), and the resulting, merged spec will
	 * be wired.
	 * @private
	 *
	 * @param {String|Object|String[]|Object[]} specs
	 * @param {Object} parent context
	 * @param {Object} [options]
	 *
	 * @return {Promise} a promise for the new context
	 */
	return function createContext(specs, parent, options) {
		// Do the actual wiring after all specs have been loaded

		if(!options) { options = {}; }
		if(!parent)  { parent  = {}; }

		options.createContext = createContext;

		var specLoader = createSpecLoader(parent.moduleLoader, options.require);

		return when(specs, function(specs) {
			options.moduleLoader =
				createContextLoader(specLoader, findBaseId(specs));

			return mergeSpecs(specLoader, specs).then(function(spec) {

				var container = new Container(parent, options);

				// Expose only the component instances and controlled API
				return container.init(spec).then(function(context) {
					return context.instances;
				});
			});
		});
	};

	function createContextLoader(parentLoader, baseId) {
		return baseId ? relativeLoader(parentLoader, baseId) : parentLoader;
	}

	/**
	 * Create a module loader
	 * @param {function} [platformLoader] platform require function with which
	 *  to configure the module loader
	 * @param {function} [parentLoader] existing module loader from which
	 *  the new module loader will inherit, if provided.
	 * @return {Object} module loader with load() and merge() methods
	 */
	function createSpecLoader(parentLoader, platformLoader) {
		var loadModule = typeof platformLoader == 'function'
			? loaderAdapter(platformLoader)
			: parentLoader || loaderAdapter(require);

		return loadModule;
	}

	function findBaseId(specs) {
		var firstId;

		if(typeof specs === 'string') {
			return specs;
		}

		if(!Array.isArray(specs)) {
			return;
		}

		specs.some(function(spec) {
			if(typeof spec === 'string') {
				firstId = spec;
				return true;
			}
		});

		return firstId;
	}

	function mergeSpecs(moduleLoader, specs) {
		return when(specs, function(specs) {
			return when.resolve(Array.isArray(specs)
				? mergeAll(moduleLoader, specs)
				: (typeof specs === 'string' ? moduleLoader(specs) : specs));
		});
	}

	function mergeAll(moduleLoader, specs) {
		return when.reduce(specs, function(merged, module) {
			return typeof module == 'string'
				? when(moduleLoader(module), function(spec) { return mixin(merged, spec); })
				: mixin(merged, module);
		}, {});
	}

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
