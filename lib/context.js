/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(function(require) {

	'use strict';

	var loader, createScope;

	loader = require('./loader');
	createScope = require('./scope');

	return createContext;

	/**
	 * Creates a new context from the supplied specs, with the supplied parent context.
	 * If specs is an {Array}, it may be a mixed array of string module ids, and object
	 * literal specs.  All spec module ids will be loaded, and then all specs will be
	 * merged from left-to-right (rightmost wins), and the resulting, merged spec will
	 * be wired.
	 * @private
	 *
	 * @param {String|Object|String[]|Object[]} specs
	 * @param {Object} parent context
	 * @param {Object} [options]
	 *
	 * @return {Promise} a promise for the new context
	 */
	function createContext(specs, parent, options) {
		// Do the actual wiring after all specs have been loaded

		if(!options) {
			options = {}
		}

		options.createContext = createContext;

		var moduleLoader = loader(parent, options);

		return moduleLoader.merge(specs).then(function(spec) {
			return createScope(spec, parent, options)
				.then(function(scope) {
					return scope.components;
				});
			}
		);
	}

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
