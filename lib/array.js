/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(function() {
"use strict";

	var call, slice;

	call = Function.prototype.bind.call;
	slice = call.bind(Array.prototype.slice);

	return {
		delegate: delegateArray,
		fromArguments: fromArguments
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
		return slice(args, index||0);
	}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(); }
);