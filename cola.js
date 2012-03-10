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
	'cola/transform/enum', 'cola/transform/expression', 'cola/addPropertyTransforms',
	'cola/transformCollection', 'cola/transform/compose'],
function(when, adapterResolver,
	ArrayAdapter, NodeListAdapter, ResultSetAdapter, QueryAdapter, syncCollections,
	ObjectAdapter, NodeAdapter,
	ResultAdapter, syncProperties,
	createEnumTransformer, createExpressionTransformer, addPropertyTransforms,
	transformCollection, compose
) {

	var cachedBindings, isArray;

	// TODO: move most of this stuff, including adapter registration to cola.js
	// TODO: implement wire$build that auto-adds these deps to build
	adapterResolver.register(ArrayAdapter, 'collection');
	adapterResolver.register(NodeListAdapter, 'collection');
//	adapterResolver.register(ResultSetAdapter, 'collection');
	adapterResolver.register(QueryAdapter, 'collection');
	adapterResolver.register(NodeAdapter, 'object');
	adapterResolver.register(ObjectAdapter, 'object');
//	adapterResolver.register(ResultAdapter, 'object');

	function querySelector (selector, node) {
		return node.querySelector(selector);
	}

	isArray = Array.isArray || function(it) {
		return Object.prototype.toString.call(it) == '[object Array]';
	};

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

	function mixin(dst, src) {
		for(var p in src) {
			dst[p] = src[p];
		}
		return dst;
	}

	function mergeBindings(bindingDef, bindings) {
		mixin(bindingDef.bindings, bindings);
	}

	function createPropertyTransform(transforms, wire) {

		if(!isArray(transforms)) {
			transforms = [transforms];
		}

		return when.reduce(transforms,
			function(txList, txSpec) {
				var name;

				for(name in txSpec) {
					if(name != 'inverse') break;
				}

				return when(wire.resolveRef(name),
					function(createTransform) {
						var transform = createTransform(txSpec[name]);
						txList.push(txSpec.inverse ? transform.inverse : transform);
						return txList;
					}
				);
			}, []).then(
			function(txList) {
				return txList.length > 1 ? compose(txList) : txList[0];
			}
		);
	}

	function setupBinding(bindingSpecs, name, wire) {
		var bindingSpec, binding;

		bindingSpec = mixin({}, bindingSpecs[name]);
		binding = {
			name: name,
			spec: bindingSpec
		};

		return bindingSpec.transform
			? when(createPropertyTransform(bindingSpec.transform, wire),
				function(propertyTransform) {
					binding.spec.transform = propertyTransform;
					return binding;
				})
			: binding;
	}

	function setupBindings(bindingSpecs, wire) {
		var promises = [];

		for(var name in bindingSpecs) {
			promises.push(setupBinding(bindingSpecs, name, wire));
		}

		return when.reduce(promises, function(bindings, bindingSpec) {
			bindings[bindingSpec.name] = bindingSpec.spec;
			return bindings;
		}, {});
	}

	function cacheBindings(resolver, proxy, wire, pluginOptions) {
		// wire the bindings immediately, in the same context as they
		// are declared.  Since bindings/bind may be in different
		// contexts, deferring the wiring until bind could cause
		// lots of confusion, since they'd be wired in that context,
		// not in the one where they are declared.
		when(wire(proxy.options),
			function(bindings) {

				return when(setupBindings(bindings, wire),
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
					}
				);
			}
		).then(resolver.resolve, resolver.reject);
	}

	function removeCachedBindings(resolver, proxy /*, wire */) {
		// If there were any bindings that were never used (via "bind"), we
		// can remove them now since the component is being destroyed.
		findCachedBindings(proxy.target, function(cachedBindings, i) {
			cachedBindings.splice(i, 1);
		});

		resolver.resolve();
	}

	function collectPropertyTransforms(bindings) {
		var name, propertyTransforms, transform;

		propertyTransforms = {};
		for(name in bindings) {
			transform = bindings[name].transform;
			if(transform) {
				propertyTransforms[name] = transform;
			}
		}

		return propertyTransforms;
	}

	function createAdapter(obj, type, options) {
		// FIXME: This is just for initial testing
		var Adapter, adapter;
		Adapter = adapterResolver(obj, type);
		// if (!Adapter) throw new Error('wire/cola: could not find Adapter constructor for ' + type);
		adapter = Adapter ? new Adapter(obj, options) : obj;

		if (options.bindings && type == 'object') {
			adapter = addPropertyTransforms(adapter, collectPropertyTransforms(options.bindings));
		}

		return adapter;
	}

	function doBind(target, datasource, bindings, options, wire) {
		// TODO: create comparator from options (e.g. sortBy: ['prop1', 'prop2'])
		// TODO: create symbolizer from options (e.g. key: ['name', 'version'])
		var adapter1, adapter2, collectionTransform;

		options = mixin({
			querySelector: querySelector
		}, options || {});

		// TODO: ensure these are in the right order so transforms are always in the right order
		adapter1 = createAdapter(datasource, 'collection', options);

		collectionTransform = options.transform;
		if (collectionTransform) {
			if (typeof collectionTransform != 'function') {
				collectionTransform = compose(collectionTransform);
			}
			adapter1 = transformCollection(adapter1, collectionTransform);
		}

		options = mixin({ bindings: bindings }, options);
		adapter2 = createAdapter(target, 'collection', options);

		// FIXME: throw if we can't create an adapter?
		if (!(adapter1 && adapter2)) return;

		return syncCollections(adapter1, adapter2, createAdapter);
	}

	return {
		wire$plugin: function(ready, destroyed, pluginOptions) {

			var unmediators = [];

			// TODO: allow querySelector to be specified in pluginOptions?


			function bindFacet(resolver, proxy, wire) {
				// Find any cached bindings for this component, and if found
				// setup cola data binding.
				findCachedBindings(proxy.target,
					function(cachedBindings, i, bindingDef) {
						// Remove cached bindings
						cachedBindings.splice(i, 1);

						// Wire pluginOptions, then bind to the datasource
						when(wire(proxy.options), function(options) {
							var datasource;

							if(options.to) {
								datasource = options.to;
							} else {
								datasource = options;
								options = {};
							}

							// TODO: mixin proxy.options onto pluginOptions?
							options = mixin(options, bindingDef.pluginOptions);

							// Use cached bindings to setup cola data binding for
							// the current target component
							var unmediate = doBind(bindingDef.target, datasource, bindingDef.bindings, options);

							unmediators.push(unmediate);

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
	: function(deps, factory) {
		module.exports = factory.apply(this, deps.map(function(x) {
			return require(x);
		}));
	}
);
