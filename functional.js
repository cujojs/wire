/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * functional plugin
 * Plugin that provides ways of working with pure functions in wire
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define) {
define(['when', './lib/functional'], function(when, functional) {
"use strict";

	var undef;

	function composeFactory(resolver, spec, wire) {
		var promise;

		spec = spec.compose;

		if(typeof spec == 'string') {
			promise = functional.compose.parse(undef, spec, wire.resolveRef, wire.getProxy);
		} else {
			// Assume it's an array of things that will wire to functions
			promise = when(wire(spec), function(funcArray) {
				return functional.compose(funcArray);
			});
		}

		when.chain(promise, resolver);
	}

	function doBind(resolver, bind, name, refObj, wire) {
		var context, spec;

		context = typeof refObj.context == 'string'
			? { $ref: refObj.context }
			: refObj.context;

		spec = [
			{ $ref: name },
			context
		];

		if('args' in refObj) {
			spec = spec.concat(refObj.args);
		}

		return when(wire(spec), function(args) {
			return bind.apply(undef, args);
		}).then(resolver.resolve, resolver.reject);

	}

	function bindResolver(resolver, name, refObj, wire) {
		doBind(resolver, functional.bind, name, refObj, wire);
	}

	return {
		wire$plugin: function(/*ready, destroyed, options*/) {
			return {
				factories: {
					compose: composeFactory
				},
				resolvers: {
					bind: bindResolver
				}
			}
		}
	};

});
})(typeof define == 'function'
	// use define for AMD if available
	? define
	: function(deps, factory) {
		module.exports = factory.apply(this, deps.map(function(x) {
			return require(x);
		}));
	}
);
