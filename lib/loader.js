/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Loading and merging modules
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: brian@hovercraftstudios.com
 */
(function(define) {
define(function(require) {

	var when, object, getPlatformLoader;

	when = require('when');
	object = require('./object');

	// Get the platform's loader
	getPlatformLoader = typeof exports == 'object'
		? function(require) {
			return function(moduleId) {
				try {
					return when.resolve(require(moduleId));
				} catch(e) {
					return when.reject(e);
				}
			}
		}
		: function (require) {
			return function(moduleId) {
				var deferred = when.defer();
				require([moduleId], deferred.resolve, deferred.reject);
				return deferred.promise;
			};
		};

	return getModuleLoader;

	/**
	 * Create a module loader
	 * @param {Object} context
	 * @param {function} [context.moduleLoader] existing module loader from which
	 *  the new module loader will inherit, if provided.
	 * @param {Object} options
	 * @param {function} [options.require] require function with which to configure
	 *  the module loader
	 * @return {Object} module loader with load() and merge() methods
	 */
	function getModuleLoader(context, options) {
		var loadModule = options && options.require
			? getPlatformLoader(options.require)
			: context.moduleLoader || getPlatformLoader(require);

		return {
			load: loadModule,
			merge: function(specs) {
				return when(specs, function(specs) {
					return when.resolve(Array.isArray(specs)
						? mergeAll(specs, loadModule)
						: (typeof specs === 'string' ? loadModule(specs) : specs));
				});
			}
		};
	}

	function mergeAll(specs, loadModule) {
		return when.reduce(specs, function(merged, module) {
			return typeof module == 'string'
				? when(loadModule(module), function(spec) { return object.safeMixin(merged, spec); })
				: object.safeMixin(merged, module);
		}, {});
	}

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));

