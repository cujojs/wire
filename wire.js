/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: wire.js
*/

//noinspection ThisExpressionReferencesGlobalObjectJS
(function(global, undef){
	define(['require', 'when', 'wire/base'], function(require, when, basePlugin) {

	"use strict";

	var VERSION, tos, rootContext, rootSpec, delegate, emptyObject,
		defer, chain, whenAll, isPromise;

	wire.version = VERSION = "0.6.5";
	tos = Object.prototype.toString;
	rootSpec = global['wire'] || {};

	delegate = Object.create || createObject;

	emptyObject = {};

	// Local refs to when.js
	defer = when.defer;
	chain = when.chain;
	whenAll = when.all;
	isPromise = when.isPromise;

	// Helper to reject a deferred when another is rejected
	function chainReject(resolver) {
		return function(err) { resolver.reject(err); };
	}

	function indexOf(array, item) {
		for (var i = 0, len = array.length; i < len; i++) {
			if(array[i] === item) return i;
		}

		return -1;
	}

	//
	// AMD Module API
	//

	function wire(spec) {
		var d = defer();

		// If the root context is not yet wired, wire it first
		if (!rootContext) {
			rootContext = wireContext(rootSpec);
		}

		// Use the rootContext to wire all new contexts.
		when(rootContext).then(
			function(root) {
				chain(root.wire(spec), d);
			},
			chainReject(d)
		);

		return d.promise;
	}

	//
	// AMD loader plugin API
	//

	//noinspection JSUnusedLocalSymbols
	function amdLoad(name, require, callback, config) {
		var promise = callback.resolve
			? callback
			: {
				resolve: callback,
				reject: function(err) { throw err; }
			};

		chain(wire(name), promise);
	}

	wire.load = amdLoad;

	//
	// AMD Analyze/Build plugin API
	//
	// Separate builder plugin as per CommonJS LoaderPlugin spec:
	// http://wiki.commonjs.org/wiki/Modules/LoaderPlugin

	// plugin-builder: wire/cram/builder

	//
	// Private functions
	//

	function wireContext(specs, parent) {

		var deferred = defer();

		// Function to do the actual wiring.  Capture the
		// parent so it can be called after an async load
		// if spec is an AMD module Id string.
		function doWireContexts(specs) {
			var spec = mergeSpecs(specs);

			createScope(spec, parent).then(
				function(scope) {
					deferred.resolve(scope.objects);
				},
				chainReject(deferred)
			);
		}

    	// If spec is a module Id, or list of module Ids, load it/them, then wire.
    	// If it's a spec object or array of objects, wire it now.
    	if(isString(specs)) {
		    var specIds = specs.split(',');

    		require(specIds, function() { doWireContexts(arguments); });
		} else {
			doWireContexts(isArray(specs) ? specs : [specs]);
		}

		return deferred;
	}

	// Merge multiple specs together before wiring.
	function mergeSpecs(specs) {
		for (var i = 0, merged = {}, s; (s = specs[i++]);) {
			mixinSpec(merged, s);
		}

		return merged;
	}

	// Add components in from to those in to.  If duplicates are found, it
	// is an error.
	function mixinSpec(to, from) {
		for (var name in from) {
			if (from.hasOwnProperty(name) && !(name in emptyObject)) {
				if (to.hasOwnProperty(name)) {
					throw new Error("Duplicate component name in sibling specs: " + name);
				} else {
					to[name] = from[name];
				}
			}
		}
	}

	function createScope(scopeDef, parent, scopeName) {
		var scope, local, proxied, objects, resolvers, factories, facets, listeners, proxies,
			modulesToLoad, moduleLoadPromises,
			wireApi, modulesReady, scopeReady, scopeDestroyed,
			promises, name, contextPromise, doDestroy;


		// Empty parent scope if none provided
		parent = parent || {};

		local = {};

		// Descend scope and plugins from parent so that this scope can
		// use them directly via the prototype chain
		objects   = delegate(parent.objects  ||{});
		resolvers = delegate(parent.resolvers||{});
		factories = delegate(parent.factories||{});
		facets    = delegate(parent.facets   ||{});

		listeners = parent.listeners ? [].concat(parent.listeners) : [];

		// Proxies is an array, have to concat
		proxies = parent.proxies ? [].concat(parent.proxies) : [];
		proxied = [];

		modulesToLoad = [];
		moduleLoadPromises = {};
		modulesReady = defer();

		scopeReady = defer();
		scopeDestroyed = defer();

		// A proxy of this scope that can be used as a parent to
		// any child scopes that may be created.
		var scopeParent = {
			name:       scopeName,
			objects:    objects,
			destroyed:  scopeDestroyed
		};

		// Full scope definition.  This will be given to sub-scopes,
		// but should never be given to child contexts
		scope = delegate(scopeParent);
		
		scope.local = local;
		scope.resolvers = resolvers;
		scope.factories = factories;
		scope.facets = facets;
		scope.listeners = listeners;
		scope.proxies = proxies;
		scope.resolveRef = doResolveRef;
		scope.destroy = destroy;
		scope.path = createPath(scopeName, parent.path);

		// Plugin API
		// wire() API that is passed to plugins.
		function pluginApi(spec, name, path) {
			return createItem(spec, createPath(name, path));
		}

		// It has additional methods that plugins can use
		pluginApi.resolveRef = apiResolveRef;
		pluginApi.deferred   = defer;
		pluginApi.when       = when;
		pluginApi.whenAll    = whenAll;
		pluginApi.ready      = scopeReady.promise;

		// When the parent begins its destroy phase, this child must
		// begin its destroy phase and complete it before the parent.
		// The context hierarchy will be destroyed from child to parent.
		if (parent.destroyed) {
			parent.destroyed.then(destroy);
		}

		scanPlugin(basePlugin);

		promises = [];

		// Setup a promise for each item in this scope
		var p;
		for (name in scopeDef) {
			promises.push(p = objects[name] = defer());
		}

		contextPromise = chain(scopeReady, defer(), objects);

		// Context API
		// API of a wired context that is returned, via promise, to
		// the caller.  It will also have properties for all the
		// objects that were created in this scope.
		function apiResolveRef(ref) {
			return when(doResolveRef(ref));
		}

		function apiDestroy() {
			return destroy().promise;
		}

		function wireChild(spec) {
			return wireContext(spec, scopeParent);
		}

		wireApi = objects.wire = wireChild;

		wireApi.then    = contextPromise.then;
		wireApi.destroy = objects.destroy = apiDestroy;
		wireApi.resolve = objects.resolve = apiResolveRef;

		// When all scope item promises are resolved, the scope
		// is resolved.
		chain(whenAll(promises), scopeReady, scope);

		// Process/create each item in scope and resolve its
		// promise when completed.
		for (name in scopeDef) {
			createScopeItem(name, scopeDef[name], objects[name]);
		}

		// Once all modules have been loaded, resolve modulesReady
		require(modulesToLoad, function(modules) {
			modulesReady.resolve(modules);
			moduleLoadPromises = modulesToLoad = null;
		});

		doDestroy = function() {
			var p, promises, pDeferred, i;

			// Retain a do-nothing doDestroy() func, in case
			// it is called again for some reason.
			doDestroy = function() {};

			scopeDestroyed.resolve();

			// TODO: Clear out the context prototypes?

			promises = [];
			for (i = 0; (p = proxied[i++]);) {
				pDeferred = defer();
				promises.push(pDeferred);
				processListeners(pDeferred, 'destroy', p);
			}

			// *After* listeners are processed,
			whenAll(promises).then(function() {
				var p, i;
				for (p in local)   delete local[p];
				for (p in objects) delete objects[p];
				for (p in scope)   delete scope[p];

				for (i = 0; (p = proxied[i++]);) {
					p.destroy();
				}

				local = objects = scope = proxied = proxies = parent
					= resolvers = factories = facets = wireApi
					= listeners = null;
			});
		};

		return scopeReady;

		//
		// Scope functions
		//

		function createPath(name, basePath) {
			var path = basePath || scope.path;

			return (path && name) ? (path + '.' + name) : name;
		}

		function createScopeItem(name, val, itemPromise) {
			// NOTE: Order is important here.
			// The object & local property assignment MUST happen before
			// the chain resolves so that the concrete item is in place.
			// Otherwise, the whole scope can be marked as resolved before
			// the final item has been resolved.
			var p = createItem(val, name);

			p.then(function(resolved) {
				objects[name] = local[name] = resolved;
			});

			chain(p, itemPromise);
		}

		function createItem(val, name) {
			var created;

			if (isRef(val)) {
				// Reference
				created = resolveRef(val, name);

			} else if (isArray(val)) {
				// Array
				created = createArray(val, name);

			} else if (isStrictlyObject(val)) {
				// Module or nested scope
				created = createModule(val, name);

			} else {
				// Plain value
				created = val;
			}

			// Always return a promise
			return when(created);
		}

		function loadModule(moduleId, spec) {
			var d;

			if (isString(moduleId)) {
				var m = moduleLoadPromises[moduleId];

				if (!m) {
					modulesToLoad.push(moduleId);
					m = moduleLoadPromises[moduleId] = {
						id: moduleId,
						deferred: (d = defer())
					};

					moduleLoadPromises[moduleId] = m;

					require([moduleId], function(module) {
						scanPlugin(module, spec);
						m.module = module;
						chain(modulesReady, m.deferred, m.module);
					});
				} else {
					d = m.deferred;
				}

			} else {
				d = defer();
				d.resolve(moduleId);
			}

			return d;
		}

		function scanPlugin(module, spec) {
			if (typeof module == 'object' && isFunction(module.wire$plugin)) {
				var plugin = module.wire$plugin(contextPromise, scopeDestroyed, spec);
				if (plugin) {
					addPlugin(plugin.resolvers, resolvers);
					addPlugin(plugin.factories, factories);
					addPlugin(plugin.facets, facets);

					listeners.push(plugin);

					addProxies(plugin.proxies);
				}
			}
		}

		function addProxies(proxiesToAdd) {
			if(!proxiesToAdd) return;
			
			var newProxies, p;
			newProxies = [];
			for (var i = 0, len = proxiesToAdd.length; i < len; i++) {
				p = proxiesToAdd[i];
				if(indexOf(proxies, p) < 0) {
					newProxies.push(p)
				}
			}

			scope.proxies = proxies = newProxies.concat(proxies);
		}

		function addPlugin(src, registry) {
			for (var name in src) {
				if (registry.hasOwnProperty(name)) {
					throw new Error("Two plugins for same type in scope: " + name);
				}

				registry[name] = src[name];
			}
		}

		function createArray(arrayDef, name) {
			var promise, result;

			promise = defer();
			result = [];

			if (arrayDef.length === 0) {
				promise.resolve(result);

			} else {
				var promises, itemPromise, item, id, i;

				promises = [];

				for (i = 0; (item = arrayDef[i]); i++) {
					id = item.id || name + '[' + i + ']';
					itemPromise = result[i] = createItem(arrayDef[i], id);
					promises.push(itemPromise);

					resolveArrayValue(itemPromise, result, i);
				}

				chain(whenAll(promises), promise, result);
			}

			return promise;
		}

		function resolveArrayValue(promise, array, i) {
			promise.then(function(value) {
				array[i] = value;
			});
		}

		function createModule(spec, name) {
			var promise = defer();

			// Look for a factory, then use it to create the object
			findFactory(spec).then(
				function(factory) {
					if(!spec.id) spec.id = name;
					var factoryPromise = defer();
					factory(factoryPromise.resolver, spec, pluginApi);
					chain(processObject(factoryPromise, spec), promise);
				},
				function() {
					// No factory found, treat object spec as a nested scope
					createScope(spec, scope, name).then(
						function(created) { promise.resolve(created.local); },
						chainReject(promise)
					);
				}
			);

			return promise;
		}

		function findFactory(spec) {
			var promise = defer();

			// FIXME: Should not have to wait for all modules to load,
			// but rather only the module containing the particular
			// factory we need.  But how to know which factory before
			// they are all loaded?
			// Maybe need a special syntax for factories, something like:
			// create: "factory!whatever-arg-the-factory-takes"
			// args: [factory args here]
			if (spec.module) {
				promise.resolve(moduleFactory);
			} else if (spec.create) {
				promise.resolve(instanceFactory);
			} else if (spec.wire) {
				promise.resolve(wireFactory);
			} else {
				modulesReady.then(function() {
					for (var f in factories) {
						if (spec.hasOwnProperty(f)) {
							promise.resolve(factories[f]);
							return;
						}
					}

					promise.reject();
				});
			}

			return promise;
		}


		function processObject(target, spec) {
			var promise, created, configured, initialized, destroyed, fail;

			promise = defer();

			created     = defer();
			configured  = defer();
			initialized = defer();
			destroyed   = defer();

			fail = chainReject(promise);

			// After the object has been created, update progress for
			// the entire scope, then process the post-created facets
			when(target)
				.then(function(object) {
					chain(scopeDestroyed, destroyed, object);

                var proxy = createProxy(object, spec);
				proxied.push(proxy);

		        chain(processFacets('create', proxy), created)
		        .then(function() {
					return chain(processFacets('configure', proxy), configured);
				}, fail)
                .then(function() {
                    return chain(processFacets('initialize', proxy), initialized);
                }, fail)
                .then(function() {
                    return chain(processFacets('ready', proxy), promise);
                }, fail);
			}, fail);

			return promise;
		}

		function createProxy(object, spec) {
			var proxy, id, i;

			i = 0;
			id = spec.id;

			while(!(proxy = proxies[i++](object, spec))) {}

			proxy.target = object;
			proxy.spec   = spec;
			proxy.id     = id;
			proxy.path   = createPath(id);

			return proxy;
		}

		function processFacets(step, proxy) {
			var promises, options, name, spec;
			promises = [];
			spec = proxy.spec;

			for(name in facets) {
				options = spec[name];
				if(options) {
					processStep(promises, facets[name], step, proxy, options);
				}
			}

			var d = defer();

			whenAll(promises).then(
				function() { processListeners(d, step, proxy); },
				chainReject(d)
			);

			return d;
		}

		function processListeners(promise, step, proxy) {
			var listenerPromises = [];
			for(var i=0; i<listeners.length; i++) {
				processStep(listenerPromises, listeners[i], step, proxy);
			}

			// FIXME: Use only proxy here, caller should resolve target
			return chain(whenAll(listenerPromises), promise, proxy.target);
		}

		function processStep(promises, processor, step, proxy, options) {
			var facet, facetPromise;

			if(processor && processor[step]) {
				facetPromise = defer();
				promises.push(facetPromise);

				facet = delegate(proxy);
				facet.options = options;
				processor[step](facetPromise.resolver, facet, pluginApi);
			}
		}

		//
		// Built-in Factories
		//

		function moduleFactory(resolver, spec /*, wire, name*/) {
			var module = spec.module;
			
			if(isString(module)) {
				chain(loadModule(module, spec), resolver);
			} else {
				resolver.resolve(module);
			}
		}

		/*
		 Function: instanceFactory
		 Factory that uses an AMD module either directly, or as a
		 constructor or plain function to create the resulting item.
		 */
		//noinspection JSUnusedLocalSymbols
		function instanceFactory(resolver, spec, wire) {
			var fail, create, module, args, isConstructor, name;

			fail = chainReject(resolver);
			name = spec.id;

			create = spec.create;
			if (isStrictlyObject(create)) {
				if(create.module)
				module = create.module;
				args = create.args;
				isConstructor = create.isConstructor;
			} else {
				module = create;
			}

			// Load the module, and use it to create the object
			function handleModule(module) {
				function resolve(resolvedArgs) {
					try {
						var instantiated = instantiate(module, resolvedArgs, isConstructor);
						resolver.resolve(instantiated);
					} catch(e) {
						resolver.reject(e);
					}
				}

				try {
					// We'll either use the module directly, or we need
					// to instantiate/invoke it.
					if (isFunction(module)) {
						// Instantiate or invoke it and use the result
						if (args) {
							args = isArray(args) ? args : [args];
							createArray(args, name).then(resolve, fail);

						} else {
							// No args, don't need to process them, so can directly
							// insantiate the module and resolve
							resolve([]);

						}

					} else {
						// Simply use the module as is
						resolver.resolve(module);

					}
				} catch(e) {
					fail(e);
				}
			}

			if (isString(module)) {
				loadModuleForSpec(module, spec).then(handleModule, fail);
			} else {
				handleModule(module);
			}
		}

		function wireFactory(resolver, spec/*, wire, name*/) {
			var options, module, wait, defer;

			options = spec.wire;
			wait = false;

			// Get child spec and options
			if(typeof options === 'string') {
				module = options;
			} else {
				module = options.spec;
				defer = options.defer;
				wait = options.wait;
			}

			function createChild() {
				return wireChild(module);
			}

			if(defer) {
				resolver.resolve(createChild);
			} else {
				// Start wiring the child
				var context = createChild();

				// If wait is true, only resolve this factory call when
				// the child has completed wiring.
				// Otherwise, resolve immediately with the child promise
				if(wait) {
					chain(context, resolver);
				} else {
					resolver.resolve(context);
				}
			}
		}

		//
		// Reference resolution
		//

		function resolveRef(ref, name) {
			var refName = ref.$ref;

			return doResolveRef(refName, ref, name == refName);
		}

		function doResolveRef(refName, refObj, excludeSelf) {
			var promise, registry;

			registry = excludeSelf ? parent.objects : objects;

			if (refName in registry) {
				promise = registry[refName];

			} else {
				var split;

				promise = defer();
				split = refName.indexOf('!');

				if (split > 0) {
					var name = refName.substring(0, split);
					if (name == 'wire') {
						wireResolver(promise/*, name, refObj, pluginApi*/);

					} else {
						// Wait for modules, since the reference may need to be
						// resolved by a resolver plugin
						modulesReady.then(function() {

							var resolver = resolvers[name];
							if (resolver) {
								refName = refName.substring(split + 1);
								resolver(promise, refName, refObj, pluginApi);

							} else {
								promise.reject("No resolver found for ref: " + refObj);

							}
						});
					}

				} else {
					promise.reject("Cannot resolve ref: " + refName);
				}

			}

			return promise;
		}

		function wireResolver(promise /*, name, refObj, wire*/) {
			promise.resolve(wireApi);
		}

		//
		// Destroy
		//

		function destroy() {
			scopeReady.then(doDestroy, doDestroy);

			return scopeDestroyed;

		}

	} // createScope

	function isRef(it) {
		return it && it.$ref;
	}

	/*
	 Function: isArray
	 Standard array test

	 Parameters:
	 it - anything

	 Returns:
	 true iff it is an Array
	 */
	function isArray(it) {
		return tos.call(it) == '[object Array]';
	}

	function isString(it) {
		return typeof it == 'string';
	}

	function isStrictlyObject(it) {
		return tos.call(it) == '[object Object]';
	}

	/*
	 Function: isFunction
	 Standard function test

	 Parameters:
	 it - anything

	 Returns:
	 true iff it is a Function
	 */
	function isFunction(it) {
		return typeof it == 'function';
	}

	// In case Object.create isn't available
	function T() {}

	function createObject(prototype) {
		T.prototype = prototype;
		return new T();
	}

	/*
	 Constructor: Begetter
	 Constructor used to beget objects that wire needs to create using new.

	 Parameters:
	 ctor - real constructor to be invoked
	 args - arguments to be supplied to ctor
	 */
	function Begetter(ctor, args) {
		return ctor.apply(this, args);
	}

	/*
	 Function: instantiate
	 Creates an object by either invoking ctor as a function and returning the
	 result, or by calling new ctor().  It uses a simple heuristic to try to
	 guess which approach is the "right" one.

	 Parameters:
	 ctor - function or constructor to invoke
	 args - array of arguments to pass to ctor in either case

	 Returns:
	 The result of invoking ctor with args, with or without new, depending on
	 the strategy selected.
	 */
	function instantiate(ctor, args, forceConstructor) {

		if (forceConstructor || isConstructor(ctor)) {
			Begetter.prototype = ctor.prototype;
			Begetter.prototype.constructor = ctor;
			return new Begetter(ctor, args);
		} else {
			return ctor.apply(null, args);
		}
	}

	/*
	 Function: isConstructor
	 Determines with the supplied function should be invoked directly or
	 should be invoked using new in order to create the object to be wired.

	 Parameters:
	 func - determine whether this should be called using new or not

	 Returns:
	 true iff func should be invoked using new, false otherwise.
	 */
	function isConstructor(func) {
		var is = false, p;
		for (p in func.prototype) {
			if (p !== undef) {
				is = true;
				break;
			}
		}

		return is;
	}

	return wire;
});
})(this);