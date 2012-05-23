/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(function() {
"use strict";

	var features, arrayProto, apIndexOf, isArray, indexOf, slice;

	features = {};
	arrayProto = Array.prototype;
	slice = arrayProto.slice;

	/**
	 * For now, use a local has() to take advantage of
	 * has-aware compilers
	 * @private
	 * @return {Boolean}
	 */
	function has(feature) {
		return features[feature];
	}

	features['array-isarray'] = typeof Array.isArray == 'function' && Array.isArray([]);
	features['array-indexof'] = typeof arrayProto.indexOf == 'function';

	/**
	 * Array.isArray
	 */
	if(has('array-isarray')) {
		isArray = Array.isArray;
	} else {
		isArray = function(it) {
			return Object.prototype.toString.call(it) == '[object Array]';
		}
	}

	/**
	 * Array.prototype.indexOf
	 */
	if(has('array-indexof')) {
		apIndexOf = arrayProto.indexOf;
		indexOf = function (array, item) {
			return apIndexOf.call(array, item);
		}
	} else {
		indexOf = function (array, item) {
			for (var i = 0, len = array.length; i < len; i++) {
				if (array[i] === item) return i;
			}

			return -1;
		};
	}

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