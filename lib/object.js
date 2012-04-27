/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define([], function() {
"use strict";

	var create, undef;

	create = Object.create || createObject;

	return {
		isObject: isObject,
		create: create,
		inherit: inherit
	};

	function isObject(it) {
		// In IE7 tos.call(null) is '[object Object]'
		// so we need to check to see if 'it' is
		// even set
		return it && Object.prototype.toString.call(it) == '[object Object]';
	}

	/**
	 * Object.create shim
	 * @param prototype
	 */
	function createObject(prototype) {
		var created;

		T.prototype = prototype;
		created = new T();
		T.prototype = undef;

		return created;
	}

	function T() {}

	function inherit(parent) {
		return parent ? create(parent) : {};
	}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(deps, factory) {
		module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
			return require(x);
		})));
	}
);