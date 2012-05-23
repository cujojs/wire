/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(['when'], function(when) {
	"use strict";

	/**
	 * Abstract the platform's loader
	 * @type {Function}
	 * @param require {Function} platform-specific require
	 * @return {Function}
	 */
	var createModuleLoader;

	/**
	 * For now, use a local has() to take advantage of
	 * has-aware compilers
	 * @private
	 * @return {Boolean}
	 */
	function has() {
		return typeof define.amd != 'undefined';
	}

	if(has('amd')) {
		createModuleLoader = function(require) {
			return function(moduleId) {
				var deferred = when.defer();
				require([moduleId], deferred.resolve, deferred.reject);
				return deferred.promise;
			};
		};
	} else {
		createModuleLoader = function(require) {
			return require;
		}
	}

	return createModuleLoader;

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(deps, factory) {
		module.exports = factory.apply(this, deps.map(function(x) {
			return require(x);
		}));
	}
);