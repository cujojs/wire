/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(function() {
"use strict";

	var tos, arrayProto, apIndexOf, isArray, indexOf, slice;

	tos = Object.prototype.toString;

	arrayProto = Array.prototype;
	apIndexOf = arrayProto.indexOf;
	slice = arrayProto.slice;

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

	function fromArguments(args, index) {
		return slice.call(args, index||0);
	}

	return {
		isArray: isArray,
		indexOf: indexOf,
		delegate: delegateArray,
		fromArguments: fromArguments
	};

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(); }
);