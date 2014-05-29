/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function(require) {

	var object, when;

	when = require('when');
	object = require('./object');

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
				? when(moduleLoader(module), function(spec) { return object.mixin(merged, spec); })
				: object.mixin(merged, module);
		}, {});
	}

	return {
		mergeSpecs: mergeSpecs,
		mergeAll: mergeAll
	};
});
})(typeof define == 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }
);