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

	var when;

	when = require('when');

	return {
		after: after,
		beforeAsync: beforeAsync,
		afterAsync: afterAsync
	};

	function after(f, advice) {
		return function() {
			return advice.call(this, f.apply(this, arguments));
		}
	}

	function beforeAsync(f, advice) {
		return function() {
			var self, args;

			self = this;
			args = arguments;

			return when(advice.apply(self, args), function() {
				return f.apply(self, args);
			});
		}
	}

	function afterAsync(f, advice) {
		return function() {
			var self = this;
			return when(f.apply(self, arguments), function(result) {
				return advice.call(self, result);
			});
		}
	}


});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
