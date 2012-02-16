/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/base plugin
 * Base wire plugin that provides properties, init, and destroy facets, and
 * a proxy for plain JS objects.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define) {
define(['when'], function(when) {

	var cachedBindings;

	/**
	 * "globally" cached bindings.  Cache bindings here so that a bind can find,
	 * process, and remove them later
 	 */
	cachedBindings = [];

	/**
	 * @param target anything - target component for which to find cached bindings
	 * @param found {Function} function to call with existing cached bindings
	 * @param [notFound] {Function} function to call if no cached bindings found
	 */
	function findCachedBindings(target, found, notFound) {
		for(var i = 0, len = cachedBindings.length; i < len; i++) {
			if(cachedBindings[i].target === target) {
				return found(cachedBindings, i, cachedBindings[i]);
			}
		}

		return notFound(cachedBindings);
	}

	function doBind(target, bindings, datasource) {
		// TODO: Use cola.js to bind to datasource
		return true;
	}

	function mergeBindings(bindingDef, bindings) {
		// TODO: How to merge these depends on the format
	}

	function cacheBindings(resolver, proxy, wire) {
		// wire the bindings immediately, in the same context as they
		// are declared.  Since bindings/bind may be in different
		// contexts, deferring the wiring until bind could cause
		// lots of confusion, since they'd be wired in that context,
		// not in the one where they are declared.
		when(wire(proxy.options),
			function(bindings) {

				findCachedBindings(proxy.target,
					function(cachedBindings, i, bindingDef) {
						// Merge any existing bindings
						mergeBindings(bindingDef, bindings);
					},
					function(cachedBindings) {
						// Cache new bindings if none exist for
						// the current target
						var newBindings = {
							target: proxy.target,
							bindings: bindings
						};
						cachedBindings.push(newBindings);
					}
				);

				resolver.resolve();
			},
			resolver.reject
		);
	}

	function removeCachedBindings(resolver, proxy /*, wire */) {
		// If there were any bindings that were never used (via "bind"), we
		// can remove them now since the component is being destroyed.
		findCachedBindings(proxy.target, function(cachedBindings, i) {
			cachedBindings.splice(i, 1);
		});

		resolver.resolve();
	}

	return {
		wire$plugin: function(/* ready, destroyed, options */) {

			function bindFacet(resolver, proxy, wire) {
				// Find any cached bindings for this component, and if found
				// setup cola data binding.
				findCachedBindings(proxy.target,
					function(cachedBindings, i, bindingDef) {
						// Remove cached bindings
						cachedBindings.splice(i, 1);

						// Wire options, then bind to the datasource
						when(wire(proxy.options), function(datasource) {

							// Use cached bindings to setup cola data binding for
							// the current target component
							return doBind(bindingDef.target, bindingDef.bindings, datasource);

							// TODO: Store cola info in wire$plugin so we can tear the bindings down
							// the component is destroyed?

						}).then(resolver.resolve, resolver.reject);

					},
					function() {
						// No bindings found: "bind" was used without "bindings"
						resolver.reject('bind: no bindings declared for component: ' + proxy.id);

					}
				);
			}

			return {
				facets: {
					bindings: {
						configure: cacheBindings,
						destroy: removeCachedBindings
					},
					bind: {
						initialize: bindFacet
					}
				}
			};
		}
	};
});

})(typeof define == 'function'
	// use define for AMD if available
	? define
	: typeof module != 'undefined'
		? function(deps, factory) {
			module.exports = factory.apply(this, deps.map(require));
		}
		// If no define or module, attach to current context.
		: function(deps, factory) { this.wire_cola = factory(); }
);
