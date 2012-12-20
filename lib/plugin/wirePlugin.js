/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Plugin that allows wire to be used as a plugin within a wire spec
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define) {
define(function(require) {

	var when, async, object;

	when = require('when');
	async = require('../async');
	object = require('../object');

	return {
		wire$plugin: function(ready) {

			return {
				resolvers: {
					wire: wireResolver
				},
				factories: {
					wire: wireFactory
				}
			};

			/**
			 * Factory that creates either a child context, or a *function* that will create
			 * that child context.  In the case that a child is created, this factory returns
			 * a promise that will resolve when the child has completed wiring.
			 *
			 * @param {Object} resolver used to resolve with the created component
			 * @param {Object} spec component spec for the component to be created
			 * @param {function} wire scoped wire function
			 */
			function wireFactory(resolver, spec, wire) {
				//
				// TODO: Move wireFactory to its own module
				//
				var options, module, provide, defer, waitParent;

				options = spec.wire;

				// Get child spec and options
				if(options && 'spec' in options) {
					module = options.spec;
					waitParent = options.waitParent;
					defer = options.defer;
					provide = options.provide;
				} else {
					module = options;
				}

				function init(context) {
					var initialized;

					if(provide) {
						initialized = when(wire(provide), function(provides) {
							object.safeMixin(context.components, provides);
						});
					}

					return initialized;
				}

				function createChild(/** {Object|String}? */ mixin) {
					var spec, config;

					spec = mixin ? [].concat(module, mixin) : module;
					config = { contextHandlers: { init: init } };

					var child = wire.createChild(spec, config);
					return defer ? child
						: when(child, function(child) {
						return object.hasOwn(child, '$exports') ? child.$exports : child;
					});
				}

				if (defer) {
					// Resolve with the createChild *function* itself
					// which can be used later to wire the spec
					resolver.resolve(createChild);

				} else if(waitParent) {

					var childPromise = when(ready, function() {
						// ensure nothing is passed to createChild here
						return createChild();
					});

					resolver.resolve(async.wrapValue(childPromise));

				} else {
					when.chain(createChild(spec), resolver);

				}
			}
		}
	};

	/**
	 * Builtin reference resolver that resolves to the context-specific
	 * wire function.
	 */
	function wireResolver(resolver, _, __, wire) {
		resolver.resolve(wire.createChild);
	}

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
