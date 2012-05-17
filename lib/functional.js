/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * functional
 * Helper library for working with pure functions in wire and wire plugins
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function (define) {
define(['when'], function (when) {
"use strict";

	var slice, bind;

	slice = Array.prototype.slice;

	/**
	 * Create a partial function
	 * @param f {Function}
	 * @param [args] {*} additional arguments will be bound to the returned partial
	 * @return {Function}
	 */
	function partial(f, args/*...*/) {
		// What we want here is to allow the partial function to be called in
		// any context, by attaching it to an object, or using partialed.call/apply
		// That's why we're not using Function.bind() here.  It has no way to bind
		// arguments but allow the context to default.  In other words, you MUST bind
		// the the context to something with Function.bind().

		// Optimization: return f if no args provided
		if(arguments.length == 1) return f;

		args = slice.call(arguments, 1);

		return function() {
			return f.apply(this, args.concat(slice.call(arguments)));
		}
	}

	// TODO: partialRight?

	/**
	 * ES5 Function.bind()
	 * @type {Function}
	 * @param f {Function} function to bind
	 * @param context {*} context to which to bind
	 * @return {Function} bound function
	 */
	bind = Function.bind
		? function(f, context) {
			return Function.bind.apply(f, [context].concat(slice.call(arguments, 2)));
		}
		: function(f, context) {
			var args = slice.call(arguments, 2);
			return function() {
				return f.apply(context, args.concat(slice.call(arguments)));
			}
		};

	/**
	 * Compose functions
	 * @param funcs {Array} array of functions to compose
	 * @param [context] {Object} context on which to invoke each function in the composition
	 * @return {Function} composed function
	 */
	function compose(funcs, context) {
		return function composed(x) {
			var i, len, result;

			result = x;

			for(i = 0, len = funcs.length; i<len; i++) {
				result = funcs[i].call(context, result);
			}

			return result;
		};
	}

	/**
	 * Parses the function composition string, resolving references as needed, and
	 * composes a function from the resolved refs.
	 * @param proxy {Object} wire proxy on which to invoke the final method of the composition
	 * @param composeString {String} function composition string
	 *  of the form: 'transform1 | transform2 | ... | methodOnProxyTarget"
	 * @param resolveRef {Function} function to use is resolving references, returns a promise
	 * @return {Promise} a promise for the composed function
	 */
	compose.parse = function parseCompose(proxy, composeString, resolveRef, getProxy) {
		var bindSpecs = composeString.split(/\s*\|\s*/);

		function createProxyInvoker(proxy, method) {
			return function() {
				return proxy.invoke(method, arguments);
			}
		}

		function createBound(bindSpec) {
			var target, method;

			target = bindSpec.split('.');
			if(target.length > 1) {
				method = target[1];
				target = target[0];
				return when(getProxy(target), function(proxy) {
					return createProxyInvoker(proxy, method);
				});
			} else {
				return when(resolveRef(bindSpec),
					null,
					function() {
						return createProxyInvoker(proxy, bindSpec);
					}
				);
			}

		}

		// First, resolve each transform function, stuffing it into an array
		// The result of this reduce will an array of concrete functions
		// Then add the final context[method] to the array of funcs and
		// return the composition.
		return when.reduce(bindSpecs, function(funcs, bindSpec) {
			return when(createBound(bindSpec), function(func) {
				funcs.push(func);
				return funcs;
			});
		}, []).then(
			function(funcs) {
				var context = proxy && proxy.target;
				return funcs.length == 1
					? bind(funcs[0], context)
					: compose(funcs, context);
			}
		);
	};

	return {
		bind: bind,
		partial: partial,
		compose: compose
	};

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(deps, factory) {
		module.exports = factory.apply(this, deps.map(function(x) {
			return require(x);
		}));
	}
);
