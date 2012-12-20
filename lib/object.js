/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function() {

	var emptyObject, hasOwn;

	emptyObject = {};
	hasOwn = Object.prototype.hasOwnProperty.call.bind(Object.prototype.hasOwnProperty);

	return {
		hasOwn: hasOwn,
		isObject: isObject,
		inherit: inherit,
		safeMixin: safeMixin
	};

	function isObject(it) {
		// In IE7 tos.call(null) is '[object Object]'
		// so we need to check to see if 'it' is
		// even set
		return it && Object.prototype.toString.call(it) == '[object Object]';
	}

	function inherit(parent) {
		return parent ? Object.create(parent) : {};
	}

	/**
	 * Copy properties from to.  If duplicates are found, throws an Error
	 * @param to {Object} target object
	 * @param from {Object} source object
	 */
	function safeMixin(to, from) {
		for (var name in from) {
			if (hasOwn(from, name) && !(name in emptyObject)) {
				if (hasOwn(to, name)) {
					throw new Error("Duplicate component name: " + name);
				} else {
					to[name] = from[name];
				}
			}
		}

		return to;
	}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(); }
);