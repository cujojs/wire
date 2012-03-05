/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/cola plugin
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define) {
define(['when', 'cola/AdapterResolver',
	'cola/ArrayAdapter', 'cola/dom/NodeListAdapter',
	'cola/ResultSetAdapter', 'cola/QueryAdapter', 'cola/mediator/syncCollections',
	'cola/ObjectAdapter', 'cola/dom/NodeAdapter',
	'cola/ResultAdapter', 'cola/mediator/syncProperties',
	'cola/transform/enum', 'cola/transform/expression', 'cola/addPropertyTransforms'],
function(when, adapterResolver,
	ArrayAdapter, NodeListAdapter, ResultSetAdapter, QueryAdapter, syncCollections,
	ObjectAdapter, NodeAdapter,
	ResultAdapter, syncProperties,
	createEnumTransformer, createExpressionTransformer, addPropertyTransforms
) {

	var cachedBindings;

	// TODO: move most of this stuff, including adapter registration to cola.js
	// TODO: implement wire$build that auto-adds these deps to build
	adapterResolver.register(ArrayAdapter, 'collection');
	adapterResolver.register(NodeListAdapter, 'collection');
//	adapterResolver.register(ResultSetAdapter, 'collection');
	adapterResolver.register(QueryAdapter, 'collection');
	adapterResolver.register(NodeAdapter, 'object');
	adapterResolver.register(ObjectAdapter, 'object');
//	adapterResolver.register(ResultAdapter, 'object');

	function idComparator (a, b) { return a.id - b.id; }

	function querySelector (selector, node) {
		return node.querySelector(selector);
	}

	/**
	 * "globally" cached bindings.  Cache bindings here so that a bind can find,
	 * process, and remove them later
	 * @private
 	 */
	cachedBindings = [];

	/**
	 * @private
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

	function createAdapter(obj, type, options) {
		// FIXME: This is just for initial testing
		var Adapter, adapter, propertyTransforms;
		Adapter = adapterResolver(obj, type);
		// if (!Adapter) throw new Error('wire/cola: could not find Adapter constructor for ' + type);
		adapter = Adapter ? new Adapter(obj, options) : obj;
		if (options.bindings && type == 'object') {
			propertyTransforms = createTransformers(options.bindings);
			if (propertyTransforms) {
				adapter = addPropertyTransforms(adapter, propertyTransforms);
			}
		}
		return adapter;
	}

	/**
	 * try to figure out which transform to use by inspecting properties
	 * @private
	 * @param options
	 */
	function createTransformer (options) {
		// TODO: allow transform option objects to be $refs
		// TODO: allow multiple transforms per binding somehow
		// FIXME: make this more like adapter resolution
		var name, transformer, reverse;
		reverse = options.reverse;
		if (options.enumSet) {
			transformer = createEnumTransformer(options);
		}
		else if (options.expression) {
			transformer = createExpressionTransformer(options);
		}
		if (transformer && reverse) {
			return transformer.inverse
		}
		else {
			return transformer;
		}
	}

	function createTransformers (bindings) {
		// for now, i just assumed that transforms would be on bindings,
		// but it may be better if they were a separate object? or maybe
		// just allow transform: { $ref: 'dateTransform' } on each binding?
		var transforms, name, xformOpts;
		transforms = {};
		for (name in bindings) {
			xformOpts = bindings[name].transform;
			if (xformOpts) {
				transforms[name] = createTransformer(xformOpts)
			}
		}
		return transforms;
	}

	function doBind(target, datasource, bindings, options) {
		// TODO: create comparator from options (e.g. sortBy: ['prop1', 'prop2'])
		// TODO: create symbolizer from options (e.g. key: ['name', 'version'])
		// TODO: stop relying on idComparator even if no sortBy is specified
		var adapter1, adapter2;

		options = mixin({
			bindings: bindings,
			comparator: idComparator,
			querySelector: querySelector
		}, options || {});

		// TODO: ensure these are in the right order so transforms are always in the right order
		adapter1 = createAdapter(datasource, 'collection', options);
		adapter2 = createAdapter(target, 'collection', options);

		// FIXME: throw if we can't create an adapter?
		if(!(adapter1 && adapter2)) return;

		return syncCollections(adapter1, adapter2, createAdapter);
	}

	function mixin(dst, src) {
		for(var p in src) {
			dst[p] = src[p];
		}
		return dst;
	}

	function mergeBindings(bindingDef, bindings) {
		mixin(bindingDef.bindings, bindings);
	}

	function cacheBindings(resolver, proxy, wire, pluginOptions) {
//		console.log('bindings', proxy);
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
							bindings: bindings,
							pluginOptions: pluginOptions
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
		wire$plugin: function(ready, destroyed, pluginOptions) {
//			console.log('wire$cola', pluginOptions);

			var unmediators = [];

			// TODO: allow querySelector to be specified in pluginOptions?


			function bindFacet(resolver, proxy, wire) {
//				console.log('bind1', pluginOptions.id, proxy);
				// Find any cached bindings for this component, and if found
				// setup cola data binding.
				findCachedBindings(proxy.target,
					function(cachedBindings, i, bindingDef) {
//						console.log('bind2', pluginOptions.id, bindingDef);
						// Remove cached bindings
						cachedBindings.splice(i, 1);

						// Wire pluginOptions, then bind to the datasource
						when(wire(proxy.options), function(datasource) {

							// TODO: mixin proxy.options onto pluginOptions?

//							console.log('bind3', pluginOptions.id, datasource);
							// Use cached bindings to setup cola data binding for
							// the current target component
							var unmediate = doBind(bindingDef.target, datasource, bindingDef.bindings, bindingDef.pluginOptions);

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

			function cacheBindingsAndOptions (resolver, proxy, wire) {
				return cacheBindings(resolver, proxy, wire, pluginOptions);
			}

			destroyed.then(destroyMediators);

			return {
				facets: {
					bindings: {
						configure: cacheBindingsAndOptions,
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
