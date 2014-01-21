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

	var when, compose, pipelineSplitRx;

	when = require('when');
	compose = require('./functional').compose;
	pipelineSplitRx = /\s*\|\s*/;

	return function pipeline(proxy, composeString, wire) {

		var bindSpecs, resolveRef, getProxy;

		if(typeof composeString != 'string') {
			return wire(composeString).then(function(func) {
				return createProxyInvoker(proxy, func);
			});
		}

		bindSpecs = composeString.split(pipelineSplitRx);
		resolveRef = wire.resolveRef;
		getProxy = wire.getProxy;

		function createProxyInvoker(proxy, method) {
			return function() {
				return proxy.invoke(method, arguments);
			};
		}

		function createBound(proxy, bindSpec) {
			var target, method;

			target = bindSpec.split('.');

			if(target.length > 2) {
				throw new Error('Only 1 "." is allowed in refs: ' + bindSpec);
			}

			if(target.length > 1) {
				method = target[1];
				target = target[0];
				return when(getProxy(target), function(proxy) {
					return createProxyInvoker(proxy, method);
				});
			} else {
				if(proxy && typeof proxy.get(bindSpec) == 'function') {
					return createProxyInvoker(proxy, bindSpec);
				} else {
					return resolveRef(bindSpec);
				}
			}

		}

		// First, resolve each transform function, stuffing it into an array
		// The result of this reduce will an array of concrete functions
		// Then add the final context[method] to the array of funcs and
		// return the composition.
		return when.reduce(bindSpecs, function(funcs, bindSpec) {
			return when(createBound(proxy, bindSpec), function(func) {
				funcs.push(func);
				return funcs;
			});
		}, []).then(
			function(funcs) {
				var context = proxy && proxy.target;
				return (funcs.length == 1 ? funcs[0] : compose(funcs)).bind(context);
			}
		);
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
