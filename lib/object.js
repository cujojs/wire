/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(function() {
"use strict";

	var create, undef;

	/**
	 * For now, use a local has() to take advantage of
	 * has-aware compilers
	 * @private
	 * @return {Boolean}
	 */
	function has() {
		return typeof Object.create == 'function';
	}

	if(has('object-create')) {
		create = Object.create;
	} else {
		create = createObject;
	}

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
	: function(factory) { module.exports = factory(); }
);