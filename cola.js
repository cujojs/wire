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
define(['when', 'cola/AdapterResolver',
	'cola/ArrayAdapter', 'cola/dom/NodeListAdapter', 'cola/mediator/syncCollections',
	'cola/ObjectAdapter', 'cola/dom/NodeAdapter', 'cola/mediator/syncProperties'],
function(when, adapterResolver,
		 ArrayAdapter, NodeListAdapter, syncCollections,
		 ObjectAdapter, NodeAdapter, syncProperties) {

	var cachedBindings;

	adapterResolver.register(ArrayAdapter, 'collection');
	adapterResolver.register(NodeListAdapter, 'collection');
	adapterResolver.register(NodeAdapter, 'object');
	adapterResolver.register(ObjectAdapter, 'object');

	function idComparator (a, b) { return a.id - b.id; }

	function querySelector (selector, node) {
		return node.querySelector(selector);
	}

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

	function createAdapter(obj, options) {
		// FIXME: This is just for initial testing
		var Adapter = adapterResolver(obj, 'collection');

		return Adapter && new Adapter(obj, options);
	}

	function doBind(target, bindings, datasource) {
		var options, adapter1, adapter2;

		options = {
			bindings: bindings,
			comparator: idComparator,
			querySelector: querySelector
		};

		adapter1 = createAdapter(datasource, options);
		adapter2 = createAdapter(target, options);

		// FIXME: throw if we can't create an adapter?
		if(!(adapter1 && adapter2)) return;

		return syncCollections(adapter1, adapter2, adapterResolver);
	}

	function mixin(dst, src) {
		for(var p in src) {
			dst[p] = src[p];
		}
	}

	function mergeBindings(bindingDef, bindings) {
		mixin(bindingDef.bindings, bindings);
	}

	function cacheBindings(resolver, proxy, wire) {
		console.log('bindings', proxy);
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
		wire$plugin: function(ready, destroyed, options) {
			console.log('wire$cola', options);

			var unmediators = [];

			function bindFacet(resolver, proxy, wire) {
				console.log('bind', proxy);
				// Find any cached bindings for this component, and if found
				// setup cola data binding.
				findCachedBindings(proxy.target,
					function(cachedBindings, i, bindingDef) {
						console.log('bind', bindingDef);
						// Remove cached bindings
						cachedBindings.splice(i, 1);

						// Wire options, then bind to the datasource
						when(wire(proxy.options), function(datasource) {

							console.log('bind', datasource);
							// Use cached bindings to setup cola data binding for
							// the current target component
							var unmediate = doBind(bindingDef.target, bindingDef.bindings, datasource);

							unmediators.push(unmediate);

							return unmediate;

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

			function destroyMediators() {
				var unmediate, i;
				i = unmediators.length;
				while(unmediate = unmediators[--i]) unmediate();
			}

			destroyed.then(destroyMediators);

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
