/** @license MIT License (c) copyright original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function(require) {

	var undef, universalApply;

	universalApply = require('./universalApply');

	/**
	 * Creates an object by either invoking ctor as a function and returning the result,
	 * or by calling new ctor().  It uses a simple heuristic to try to guess which approach
	 * is the "right" one.
	 *
	 * @param ctor {Function} function or constructor to invoke
	 * @param args {Array} array of arguments to pass to ctor in either case
	 *
	 * @return The result of invoking ctor with args, with or without new, depending on
	 * the strategy selected.
	 */
	return function instantiate(ctor, args, forceConstructor) {

		var begotten, ctorResult;

		if (forceConstructor || (forceConstructor === undef && isConstructor(ctor))) {
			begotten = ctor;
			ctorResult = universalApply(ctor, begotten, args);

			if(ctorResult !== undef) {
				begotten = ctorResult;
			}
		} else {
			begotten = universalApply(ctor, undef, args);
		}

		return begotten === undef ? null : begotten;
	};

	/**
	 * Determines whether the supplied function should be invoked directly or
	 * should be invoked using new in order to create the object to be wired.
	 *
	 * @param func {Function} determine whether this should be called using new or not
	 *
	 * @returns {Boolean} true iff func should be invoked using new, false otherwise.
	 */
	function isConstructor(func) {
		var is = false, p;

		// this has to work, according to spec:
		// https://tc39.github.io/ecma262/#sec-function.prototype.tostring
		is = is || func.toString().trim().substr(0,5) === 'class';

		if(!is) {
			for (p in func.prototype) {
				if (p !== undef) {
					is = true;
					break;
				}
			}
		}

		return is;
	}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) {
		module.exports = factory(require);
	}
);
