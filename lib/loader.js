/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

/**
 * Loading and merging modules
 * @author: brian
 */
(function(define) {
define(function(require) {

	var when, object, getPlatformLoader;

	when = require('when');
	object = require('./object');

	getPlatformLoader = typeof exports == 'object'
		? function(require) {
			return require;
		}
		: function (require) {
			return function(moduleId) {
				var deferred = when.defer();
				require([moduleId], deferred.resolve, deferred.reject);
				return deferred.promise;
			};
		};

	return getModuleLoader;

	function getModuleLoader(context, options) {
		var loadModule = options && options.require
			? getPlatformLoader(options.require)
			: context.moduleLoader;

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

