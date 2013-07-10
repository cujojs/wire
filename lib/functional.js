/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * functional
 * Helper library for working with pure functions in wire and wire plugins
 *
 * NOTE: This lib assumes Function.prototype.bind is available
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function (define) { 'use strict';
define(function (require) {

	var asap, slice;

	asap = require('./asap');
	slice = [].slice;

	/**
	 * Create a partial function
	 * @param f {Function}
	 * @param [args] {*} additional arguments will be bound to the returned partial
	 * @return {Function}
	 */
	function partial(f, args/*...*/) {
		// Optimization: return f if no args provided
		if(arguments.length == 1) {
			return f;
		}

		args = slice.call(arguments, 1);

		return function() {
			return f.apply(this, args.concat(slice.call(arguments)));
		};
	}

	/**
	 * Promise-aware function composition. If any function in
	 * the composition returns a promise, the entire composition
	 * will be lifted to return a promise.
	 * @param funcs {Array} array of functions to compose
	 * @return {Function} composed function
	 */
	function compose(funcs) {
		var first;

		first = funcs[0];
		funcs = funcs.slice(1);

		return function composed() {
			var context = this;
			return funcs.reduce(function(result, f) {
				return asap(result, function(result) {
					return f.call(context, result);
				});
			}, first.apply(this, arguments));
		};
	}

	return {
		compose: compose,
		partial: partial
	};

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(require); }
);
