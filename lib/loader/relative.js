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

	var mid = require('./moduleId');

	return function relativeLoader(loader, referenceId) {
		referenceId = mid.base(referenceId);
		return function(moduleId) {
			return loader(mid.resolve(referenceId, moduleId));
		};
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
