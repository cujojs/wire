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
	define(['require', 'wire/base'], function(require, basePlugin) {

	"use strict";

	var VERSION, tos, rootContext, rootSpec, delegate, emptyObject;

	VERSION = "0.5.1";
	tos = Object.prototype.toString;
	rootSpec = global['wire'] || {};

	delegate = Object.create || createObject;

	emptyObject = {};

	//
	// AMD Module API
	//

	function wire(spec) {
		var d = Deferred();

		// If the root context is not yet wired, wire it first
		if (!rootContext) {
			rootContext = wireContext(rootSpec);
		}

		// Use the rootContext to wire all new contexts.
		when(rootContext).then(
			function(root) {
				chain(root.wire(spec), d);
			}
		);

		return d.promise;
	}

	wire.version = VERSION;

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

	var defaultModuleRegex;
	// default dependency regex
	defaultModuleRegex = /\.(module|create)$/;

	function amdAnalyze(myId, api, addDep, config) {
		// Track all modules seen in wire spec, so we only include them once
		var seenModules, specs, spec, i, childSpecRegex, moduleRegex;

		seenModules = {};
		moduleRegex = defaultModuleRegex;

		// Get config values
		if(config) {
			if(config.moduleRegex) moduleRegex = new RegExp(config.moduleRegex);
			if(config.childSpecRegex) childSpecRegex = new RegExp(config.childSpecRegex);
		}

		function addAbsoluteDep(absoluteId) {
			// Only add the moduleId if we haven't already
			if (absoluteId in seenModules) return;

			seenModules[absoluteId] = 1;
			addDep(absoluteId);
		}

		function addDependency(moduleId) {
			addAbsoluteDep(api.toAbsMid(moduleId));
		}

		function addChildSpec(specId) {
			addAbsoluteDep('wire' + '!' + api.toAbsMid(specId));
		}

		function scanObj(obj, path) {
			// Scan all keys.  This might be the spec itself, or any sub-object-literal
			// in the spec.
			for (var name in obj) {
				scanItem(obj[name], path ? ([path, name].join('.')) : name);
			}
		}

		function scanItem(it, path) {
			// Determine the kind of thing we're looking at
			// 1. If it's a string, and the key is module or create, then assume it
			//    is a moduleId, and add it as a dependency.
			// 2. If it's an object or an array, scan it recursively
			if (typeof it === 'string') {
				// If it's a regular module, add it as a dependency
				// If it's child spec, add it as a wire! dependency
				if (isDep(path)) {
					addDependency(it);
				} else if (isWireDep(path)) {
					addChildSpec(it);
				}
			}
			if (isDep(path) && typeof it === 'string') {
				// Get module def
				addDependency(it);

			} else if (isStrictlyObject(it)) {
				// Descend into subscope
				scanObj(it, path);

			} else if (isArray(it)) {
				// Descend into array
				var arrayPath = path + '[]';
				for (var i = 0, len = it.length; i < len; i++) {
					scanItem(it[i], arrayPath);
				}

			}
		}

		function isWireDep(path) {
			return childSpecRegex && childSpecRegex.test(path);
		}

		function isDep(path) {
			return moduleRegex.test(path);
		}

		// Grab the spec module id, *or comma separated list of spec module ids*
		// Split in case it's a comma separated list of spec ids
		specs = myId.split(',');

		// For each spec id, add the spec itself as a dependency, and then
		// scan the spec contents to find all modules that it needs (e.g.
		// "module" and "create")
		for (i = 0; (spec = specs[i++]);) {
			scanObj(api.load(spec));
			addDependency(spec);
		}

	}

	wire.analyze = amdAnalyze;

	//
	// Private functions
	//

	function wireContext(specs, parent) {

		var deferred = Deferred();

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
			contextApi, modulesReady, scopeReady, scopeDestroyed,
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
		modulesReady = Deferred();

		scopeReady = Deferred();
		scopeDestroyed = Deferred();

		// A proxy of this scope that can be used as a parent to
		// any child scopes that may be created.
		scope = {
			name:       scopeName,
			local:      local,
			objects:    objects,
			resolvers:  resolvers,
			factories:  factories,
			facets:     facets,
			listeners:  listeners,
			proxies: 	proxies,
			resolveRef: doResolveRef,
			destroy:    destroy,
			destroyed:  scopeDestroyed
		};

		scope.path = createPath(scopeName, parent.path);

		// Plugin API
		// wire() API that is passed to plugins.
		function pluginApi(spec) {
			return createItem(spec);
		}

		// It has additional methods that plugins can use
		pluginApi.resolveRef = apiResolveRef;
		pluginApi.deferred   = Deferred;
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
			promises.push(p = objects[name] = Deferred());
		}

		// Context API
		// API of a wired context that is returned, via promise, to
		// the caller.  It will also have properties for all the
		// objects that were created in this scope.
		function apiResolveRef(ref) {
			return when(doResolveRef(ref)).promise;
		}

		function apiWire(spec) {
			return wireContext(spec, scope).promise;
		}

		function apiDestroy() {
			return destroy().promise;
		}

		contextPromise = chain(scopeReady, Deferred(), objects).promise;

		contextApi = {
			then:       contextPromise.then,
			wire:       (objects.wire    = apiWire),
			destroy:    (objects.destroy = apiDestroy),
			resolve:    (objects.resolve = apiResolveRef)
		};

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
		});

		doDestroy = function() {
			var p, promises, pDeferred, i;

			// Retain a do-nothing doDestroy() func, in case
			// it is called again for some reason.
			doDestroy = noop;

			scopeDestroyed.resolve();

			// TODO: Clear out the context prototypes?

			promises = [];
			for (i = 0; (p = proxied[i++]);) {
				pDeferred = Deferred();
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
					if(p) p.destroy();
			}

				proxied = null;
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
				if(!val.id) val.id = name;
				created = createModule(val);

			} else {
				// Plain value
				created = val;
			}

			return chain(when(created), Deferred());
		}

		function loadModule(moduleId, spec) {
			var d;

			if (isString(moduleId)) {
				var m = moduleLoadPromises[moduleId];

				if (!m) {
					modulesToLoad.push(moduleId);
					m = moduleLoadPromises[moduleId] = {
						id: moduleId,
						deferred: (d = Deferred())
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
				d = Deferred();
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

					if (plugin.proxies) {
						proxies = plugin.proxies.concat(proxies);
					}
				}
			}
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

			promise = Deferred();
			result = [];

			if (arrayDef.length === 0) {
				promise.resolve(result);

			} else {
				var promises = [];

				for (var i = 0; i < arrayDef.length; i++) {
					var itemPromise = result[i] = createItem(arrayDef[i], name + '[' + i + ']');
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

		function createModule(spec) {
			var promise = Deferred();

			// Look for a factory, then use it to create the object
			findFactory(spec).then(
				function(factory) {
					var factoryPromise = Deferred();
					factory(factoryPromise.resolver, spec, pluginApi);
					chain(processObject(factoryPromise, spec), promise);
				},
				function() {
					// No factory found, treat object spec as a nested scope
					createScope(spec, scope).then(
						function(created) { promise.resolve(created.local); },
						chainReject(promise)
					);
				}
			);

			return promise;
		}

		function findFactory(spec) {
			var promise = Deferred();

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

			promise = Deferred();

			created     = Deferred();
			configured  = Deferred();
			initialized = Deferred();
			destroyed   = Deferred();

			fail = chainReject(promise);

			// After the object has been created, update progress for
			// the entire scope, then process the post-created facets
			when(target)
				.then(function(object) {
					chain(scopeDestroyed, destroyed, object);

				console.log("proxy", name, object, spec);

                var proxy = createProxy(object, spec);
				proxied.push(proxy);

		        chain(processFacets('create', proxy, spec), created)
		        .then(function() {
					return chain(processFacets('configure', proxy, spec), configured);
				}, fail)
                .then(function() {
                    return chain(processFacets('initialize', proxy, spec), initialized);
                }, fail)
                .then(function() {
                    return chain(processFacets('ready', proxy, spec), promise);
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

		function processFacets(step, proxy, spec) {
			var promises, options, name;
			promises = [];

			for(name in facets) {
				options = spec[name];
				if(options) {
					processStep(promises, facets[name], step, proxy, options);
				}
			}

			var d = Deferred();

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
				facetPromise = Deferred();
				promises.push(facetPromise);

				facet = delegate(proxy);
				facet.options = options;
				processor[step](facetPromise.resolver, facet, pluginApi);
			}
		}

		//
		// Built-in Factories
		//

		function moduleFactory(promise, spec /*, wire, name*/) {
			chain(loadModule(spec.module, spec), promise);
		}

		/*
		 Function: instanceFactory
		 Factory that uses an AMD module either directly, or as a
		 constructor or plain function to create the resulting item.
		 */
		function instanceFactory(promise, spec, wire, name) {
			var fail, create, module, args, isConstructor;

			fail = chainReject(promise);

			create = spec.create;
			if (isString(create)) {
				module = create;
			} else {
				module = create.module;
				args = create.args;
				isConstructor = create.isConstructor;
			}

			// Load the module, and use it to create the object
			loadModule(module, spec).then(
				function(module) {
					function resolve(resolvedArgs) {
						promise.resolve(instantiate(module, resolvedArgs, isConstructor));
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
							promise.resolve(module);

						}
					} catch(e) {
						fail(e);
					}
				},
				fail
			);
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

				promise = Deferred();
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

		function wireResolver(promise /*, name, refObj, wire */) {
			promise.resolve(contextApi);
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

	/*
	 Function: whenAll
	 Return a promise that will resolve when and only
	 when all of the supplied promises resolve.  The
	 resolution value will be an array containing the
	 resolution values of the triggering promises.
	 TODO: Figure out the best strategy for rejecting.
	 */
	function whenAll(promises) {
		var toResolve, values, deferred, resolver, rejecter, handleProgress;

		toResolve = promises.length;

		deferred = Deferred();
		values = [];

		// Resolver for promises.  Captures the value and resolves
		// the returned promise when toResolve reaches zero.
		// Overwrites resolver var with a noop once promise has
		// be resolved to cover case where n < promises.length
		// var resolver = function handleResolve(val) {
		resolver = function(val) {
			values.push(val);
			if (--toResolve === 0) {
				resolver = handleProgress = noop;
				deferred.resolve(values);
			}
		};

		// Wrapper so that resolver can be replaced
		function resolve(val) {
			resolver(val);
		}

		// Rejecter for promises.  Rejects returned promise
		// immediately, and overwrites rejecter var with a noop
		// once promise to cover case where n < promises.length.
		// TODO: Consider rejecting only when N (or promises.length - N?)
		// promises have been rejected instead of only one?
		// var rejecter = function handleReject(err) {
		rejecter = function(err) {
			rejecter = handleProgress = noop;
			deferred.reject(err);
		};

		// Wrapper so that rejecter can be replaced
		function reject(err) {
			rejecter(err);
		}

		// Progress updater.  Since this may be called many times,
		// can't overwrite it until resolve/reject.  So, it is
		// overwritten in resolve(), and reject().
		handleProgress = function(update) {
			deferred.progress(update);
		};

		function progress(update) {
			handleProgress(update);
		}

		if (toResolve == 0) {
			deferred.resolve(values);

		} else {
			for (var i = 0, len = promises.length; i < len; i++) {
				when(promises[i]).then(resolve, reject, progress);
			}
		}

		return deferred;
	}

	function when(promiseOrValue) {
		if (isPromise(promiseOrValue)) {
			return promiseOrValue;
		}

		var d = Deferred();
		d.resolve(promiseOrValue);
		return d;
	}

	function isPromise(promiseOrValue) {
		return promiseOrValue && isFunction(promiseOrValue.then);
	}

	/*
	 Function: chain
	 Chain two <Promises> such that when the first completes, the second
	 is completed with either the completion value of the first, or
	 in the case of resolve, completed with the optional resolveValue.

	 Parameters:
	 first - first <Promise>
	 second - <Promise> to complete when first <Promise> completes
	 resolveValue - optional value to use as the resolution value
	 for first.

	 Returns:
	 second
	 */
	function chain(first, second, resolveValue) {
		var args = arguments;
		first.then(
			function(val)    { second.resolve(args.length > 2 ? resolveValue : val); },
			function(err)    { second.reject(err); },
			function(update) { second.progress(update); }
		);

		return second;
	}

	function chainReject(resolver) {
		return function(err) { resolver.reject(err); };
	}

	//
	// The following Deferred promise implementation is from when.js:
	// https://github.com/briancavalier/when.js
	//

	function noop() {}

	var freeze = Object.freeze || noop;

	/*
	 Constructor: Deferred
	 Creates a new, CommonJS compliant, Deferred with fully isolated
	 resolver and promise parts, either or both of which may be given out
	 safely to consumers.
	 The Deferred itself has the full API: resolve, reject, progress, and
	 then. The resolver has resolve, reject, and progress.  The promise
	 only has then.
	 */
	function Deferred() {
		var deferred, promise, resolver, result, listeners, tail,
			_then, _progress, complete;

		_then = function(callback, errback, progback) {
			var d, listener;

			listener = {
				deferred: (d = Deferred()),
				resolve: callback,
				reject: errback,
				progress: progback
			};

			if (listeners) {
				// Append new listener if linked list already initialized
				tail = tail.next = listener;
			} else {
				// Init linked list
				listeners = tail = listener;
			}

			return d.promise;
		};

		function then(callback, errback, progback) {
			return _then(callback, errback, progback);
		}

		function resolve(val) {
			complete('resolve', val);
		}

		function reject(err) {
			complete('reject', err);
		}

		_progress = function(update) {
			var listener, progress;

			listener = listeners;

			while (listener) {
				progress = listener.progress;
				progress && progress(update);
				listener = listener.next;
			}
		};

		function progress(update) {
			_progress(update);
		}

		complete = function(which, val) {
			// Save original thenImpl
			var origThen = _then;

			// Replace thenImpl with one that immediately notifies
			// with the result.
			_then = function newThen(callback, errback) {
				var promise = origThen(callback, errback);
				notify(which);
				return promise;
			};

			// Replace complete so that this Deferred
			// can only be completed once.  Note that this leaves
			// notify() intact so that it can be used in the
			// rewritten thenImpl above.
			// Replace progressImpl, so that subsequent attempts
			// to issue progress throw.
			complete = _progress = function alreadyCompleted() {
				throw new Error("already completed");
			};

			// Final result of this Deferred.  This is immutable
			result = val;

			// Notify listeners
			notify(which);
		};

		function notify(which) {
			// Traverse all listeners registered directly with this Deferred,
			// also making sure to handle chained thens
			while (listeners) {
				var listener, ldeferred, newResult, handler;

				listener = listeners;
				ldeferred = listener.deferred;
				listeners = listeners.next;

				handler = listener[which];
				if (handler) {
					try {
						newResult = handler(result);

						if (isPromise(newResult)) {
							// If the handler returned a promise, chained deferreds
							// should complete only after that promise does.
							newResult.then(ldeferred.resolve, ldeferred.reject, ldeferred.progress);

						} else {
							// Complete deferred from chained then()
							ldeferred[which](newResult === undef ? result : newResult);

						}
					} catch(e) {
						// Exceptions cause chained deferreds to reject
						// TODO: Should this also switch remaining listeners to reject?
						// which = 'reject';
						ldeferred.reject(e);
					}
				}
			}
		}

		// The full Deferred object, with both Promise and Resolver parts
		deferred = {};

		// Promise and Resolver parts

		// Expose Promise API
		promise = deferred.promise = {
			then: (deferred.then = then)
		};

		// Expose Resolver API
		resolver = deferred.resolver = {
			resolve:  (deferred.resolve  = resolve),
			reject:   (deferred.reject   = reject),
			progress: (deferred.progress = progress)
		};

		// Freeze Promise and Resolver APIs
		freeze(promise);
		freeze(resolver);

		return deferred;
	}

	return wire;
});
})(this);
