/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function(require) {

	var WireProxy, extend, before, meld, advise, superDestroy;

	WireProxy = require('./WireProxy');
	extend = require('./object').extend;
	before = require('./advice').before;
	meld = require('meld');

	// FIXME: Remove support for meld.add after deprecation period
	advise = typeof meld === 'function' ? meld : meld.add;

	superDestroy = WireProxy.prototype.destroy;

	function ObjectProxy(target) {
		/*jshint unused:false*/
		WireProxy.apply(this, arguments);
	}

	ObjectProxy.prototype = extend(WireProxy.prototype, {
		/**
		 * Add an aspect to the proxy's target. Sub-types should
		 * override to add aspects in whatever specialized way is
		 * necessary.
		 * @param {String|Array|RegExp|Function} pointcut
		 *  expression matching methods to be advised
		 * @param {Object} aspect aspect to add
		 * @returns {{remove:function}} object with remove() that
		 *  will remove the aspect.
		 */
		advise: function(pointcut, aspect) {
			return advise(this.target, pointcut, aspect);
		}


	});

	return ObjectProxy;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
