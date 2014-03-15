/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * @author Brian Cavalier
 * @author John Hann
 */

(function (define) { 'use strict';
define(function (require) {

	var when = require('when');

	/**
	 * WARNING: This is not the function you're looking for. You
	 * probably want when().
	 * This function *conditionally* executes onFulfill synchronously
	 * if promiseOrValue is a non-promise, or calls when(promiseOrValue,
	 * onFulfill, onReject) otherwise.
	 * @return {Promise|*} returns a promise if promiseOrValue is
	 *  a promise, or the return value of calling onFulfill
	 *  synchronously otherwise.
	 */
	return function asap(promiseOrValue, onFulfill, onReject) {
		return when.isPromiseLike(promiseOrValue)
			? when(promiseOrValue, onFulfill, onReject)
			: onFulfill(promiseOrValue);
	};

});
})(typeof define == 'function' && define.amd ? define : function(factory) { module.exports = factory(require); });
