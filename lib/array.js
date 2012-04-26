/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define([], function() {
"use strict";

	var tos, arrayProto, apIndexOf, isArray, indexOf;

	tos = Object.prototype.toString;

	arrayProto = Array.prototype;
	apIndexOf = arrayProto.indexOf;

	/**
	 * Array.isArray
	 */
	isArray = Array.isArray || function (it) {
		return tos.call(it) == '[object Array]';
	};

	/**
	 * Array.prototype.indexOf
	 */
	indexOf = apIndexOf
		? function (array, item) {
		return apIndexOf.call(array, item);
	}
		: function (array, item) {
		for (var i = 0, len = array.length; i < len; i++) {
			if (array[i] === item) return i;
		}

		return -1;
	};

	/**
	 * Creates a new {Array} with the same contents as array
	 * @param array {Array}
	 * @return {Array} a new {Array} with the same contents as array. If array is falsey,
	 *  returns a new empty {Array}
	 */
	function delegateArray(array) {
		return array ? [].concat(array) : [];
	}

	return {
		isArray: isArray,
		indexOf: indexOf,
		delegate: delegateArray
	};

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