/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: wire.js
*/

(function(global, undef){
define(['require', 'wire/base'], function(require, basePlugin) {

	"use strict";

	var VERSION = "0.5",
        tos = Object.prototype.toString,
        rootContext,
        rootSpec = global['wire']||{};

    //
    // Public API
    //

    function wire(spec) {
   		var d = Deferred();

   		// If the root context is not yet wired, wire it first
   		if(!rootContext) {
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
    // AMD Plugin API
    //

    function amdPlugin(name, require, callback, config) {
		var promise = callback.resolve
			? callback
			: {
				resolve: callback,
				reject: function(err) { throw err; }
			};

		chain(wire(name), promise);
	}

	wire.load = amdPlugin;

	//
	// Private functions
	//
	
    function wireContext(spec, parent) {

    	var deferred = Deferred();

    	// Function to do the actual wiring.  Capture the
    	// parent so it can be called after an async load
    	// if spec is an AMD module Id string.
    	function doWireContext(spec) {
			createScope(spec, parent).then(
				function(scope) {
					deferred.resolve(scope.objects);
				},
				function(err) {
					deferred.reject(err);
				}
			);
    	}

    	// If spec is a module Id, load it, then wire it.
    	// If it's a spec object, wire it now.
    	if(typeof spec == 'string') {
    		require([spec], doWireContext);
    	} else {
    		doWireContext(spec);
    	}

		return deferred;
	}

	function createScope(scopeDef, parent) {
		var scope, local, objects, resolvers, factories, facets, proxies,
			modulesToLoad, moduleLoadPromises,
			contextApi, modulesReady, scopeReady, scopeDestroyed,
			promises, name;
			

		// Empty parent scope if none provided
		parent = parent||{};

		local = {};

		// Descend scope and plugins from parent so that this scope can
		// use them directly via the prototype chain
		objects   = delegate(parent.objects||{});
		resolvers = delegate(parent.resolvers||{});
		factories = delegate(parent.factories||{});
		facets    = delegate(parent.facets||{});

		// Proxies is an array, have to concat
		proxies = parent.proxies ? [].concat(parent.proxies) : [];

		modulesToLoad = [];
		moduleLoadPromises = {};
		modulesReady = Deferred();

		scopeReady = Deferred();
		scopeDestroyed = Deferred();

		// A proxy of this scope that can be used as a parent to
		// any child scopes that may be created.
		scope = {
			local:      local,
			objects:    objects,
			resolvers:  resolvers,
			factories:  factories,
			facets:     facets,
			proxies: 	proxies,
			resolveRef: doResolveRef,
			destroy:    destroy,
			destroyed:  scopeDestroyed
		};

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
		if(parent.destroyed) {
			parent.destroyed.then(null, null, destroy);
		}

		scanPlugin(basePlugin);

		promises = [];

		// Setup a promise for each item in this scope
		var p;
		for(name in scopeDef) {
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

		var contextPromise = chain(scopeReady, Deferred(), objects).promise;

		contextApi = {
			then:       contextPromise.then,
			wire:       (objects.wire = apiWire),
			destroy:    (objects.destroy = apiDestroy),
			resolve:    (objects.resolve = apiResolveRef)
		};

		// When all scope item promises are resolved, the scope
		// is resolved.
		chain(whenAll(promises), scopeReady, scope);

		// Process/create each item in scope and resolve its
		// promise when completed.
		for(name in scopeDef) {
			createScopeItem(name, scopeDef[name], objects[name]);
		}

		// Once all modules have been loaded, resolve modulesReady
		// chain(whenAll(moduleLoadPromises), modulesReady);
		require(modulesToLoad, function(modules) {
			modulesReady.resolve(modules);
		});

		return scopeReady;

		//
		// Scope functions
		//

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
			
			if(isRef(val)) {
				created = resolveRef(val, name);

			} else if(isArray(val)) {
				created = createArray(val);

			} else if(isStrictlyObject(val)) {
				created = createModule(val);

			} else {
				// Plain value
				created = val;
			}

			return chain(when(created), Deferred());
		}

		function loadModule(moduleId, spec) {
			var d;

			if(typeof moduleId == 'string') {
				var m = moduleLoadPromises[moduleId];

				if(!m) {
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
			if(typeof module == 'object' && isFunction(module.wire$plugin)) {
				var plugin = module.wire$plugin(contextPromise, scopeDestroyed, spec);
				if(plugin) {
					addPlugin(plugin.resolvers, resolvers);
					addPlugin(plugin.factories, factories);
					addPlugin(plugin.facets, facets);

					if(plugin.proxies) {
						proxies = plugin.proxies.concat(proxies);
					}					
				}
			}
		}

		function addPlugin(src, registry) {
			for(var name in src) {
				if(registry.hasOwnProperty(name)) {
					throw new Error("Two plugins for same type in scope: " + name);
				}

				registry[name] = src[name];
			}
		}

		function createArray(arrayDef) {
			var promise, result;

			promise = Deferred();
			result = [];

			if(arrayDef.length === 0) {
				promise.resolve(result);

			} else {
				var promises = [];

				for (var i = 0; i < arrayDef.length; i++) {
					var itemPromise = result[i] = createItem(arrayDef[i]);
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
			var promise;

			if(spec.module) {
				// It's just a module, load it
				promise = loadModule(spec.module, spec);
			} else {
				// Look for a factory, then use it to create the object
				promise = Deferred();

				findFactory(spec).then(function(factory) {
					factory(promise.resolver, spec, pluginApi);
				});
			}

			return processObject(promise, spec);
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
			if(spec.create) {
				promise.resolve(moduleFactory);
			} else {
				modulesReady.then(function() {
					for(var f in factories) {
						if(spec.hasOwnProperty(f)) {
							promise.resolve(factories[f]);
							return;
						}
					}
					
					promise.resolve(scopeFactory);		
				});				
			}

			return promise;
		}


		function processObject(target, spec) {
			var promise, proxy, update, created, configured, initialized, destroyed;
			
			promise = Deferred();

			update = { spec: spec };
			created     = target;
			configured  = Deferred();
			initialized = Deferred();
			destroyed   = Deferred();

			update.created     = created.promise;
			update.configured  = configured.promise;
			update.initialized = initialized.promise;
			update.destroyed   = destroyed.promise;

			function fail(err) { promise.reject(err); }

			// After the object has been created, update progress for
			// the entire scope, then process the post-created facets
			when(target).then(
				function(object) {
					chain(scopeDestroyed, destroyed, object);

					// Notify progress about this object.
					update.target = object;
					scopeReady.progress(update);

					var proxy = createProxy(object, spec);
					chain(processFacets('configure', proxy, spec), configured).then(
						function(object) {
							return chain(processFacets('initialize', proxy, spec), initialized);
						},
						fail
					).then(
						function(object) {
							return chain(processFacets('ready', proxy, spec), promise);
						},
						fail
					);
				},
				fail
			);

			return promise;
		}

		function createProxy(object, spec) {
			var proxy, i;

			i = 0;
			while(!(proxy = proxies[i++](object, spec))) {}

			proxy.target = object;

			return proxy;
		}

		function processFacets(step, proxy, spec) {
			var promises, facet, facetProcessor, options, name;

			promises = [];
			facet = delegate(proxy);

			for(name in facets) {
				options = facet.options = spec[name];
				processFacet(facets[name], step, facet, promises);
			}

			return chain(whenAll(promises), Deferred(), proxy.target);

		}

		function processFacet(processor, step, facet, promises) {
			if(facet.options && processor && processor[step]) {
				var facetPromise = Deferred();
				promises.push(facetPromise);
				processor[step](facetPromise.resolver, facet, pluginApi);
			}
		}

		//
		// Built-in Factories
		//

		/*
			Function: scopeFactory
			Factory to create a new nested scope
		*/
		function scopeFactory(promise, spec, wire) {
			return createScope(spec, scope).then(function(created) {
				promise.resolve(created.local);
			});
		}

		/*
			Function: moduleFactory
			Factory that uses an AMD module either directly, or as a
			constructor or plain function to create the resulting item.
		*/
		function moduleFactory(promise, spec, wire) {
			var moduleId;
			
			moduleId = spec.create.module||spec.create;

			// Load the module, and use it to create the object
			loadModule(moduleId, spec).then(function(module) {
				var args;
				// We'll either use the module directly, or we need
				// to instantiate/invoke it.
				if(spec.create && isFunction(module)) {
					// Instantiate or invoke it and use the result
					if(typeof spec.create == 'object' && spec.create.args) {
						args = isArray(spec.create.args) ? spec.create.args : [spec.create.args];
					} else {
						args = [];
					}

					createArray(args).then(function(resolvedArgs) {

						var object = instantiate(module, resolvedArgs);
						promise.resolve(object);

					});

				} else {
					// Simply use the module as is
					promise.resolve(module);
					
				}
			});
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

			if(refName in registry) {
				promise = registry[refName];

			} else {
				var split;

				promise = Deferred();
				split = refName.indexOf('!');

				if(split > 0) {
					var name = refName.substring(0, split);
					if(name == 'wire') {
						wireResolver(promise, name, refObj, pluginApi);

					} else {
						// Wait for modules, since the reference may need to be
						// resolved by a resolver plugin
						modulesReady.then(function() {

							var resolver = resolvers[name];
							if(resolver) {
								refName = refName.substring(split+1);
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

		function wireResolver(promise, name, refObj, wire) {
			promise.resolve(contextApi);
		}

		//
		// Destroy
		//

		function destroy() {
			scopeReady.then(doDestroy, doDestroy);

			return scopeDestroyed;

		}

		function doDestroy() {
			scopeDestroyed.progress();

			// TODO: Clear out the context prototypes?
			var p;
			for(p in local)   delete local[p];
			for(p in objects) delete objects[p];
			for(p in scope)   delete scope[p];
			
			// But retain a do-nothing destroy() func, in case
			// it is called again for some reason.
			doDestroy = noop;

			// Resolve promise
			scopeDestroyed.resolve();
		}
    }

	function isRef(it) {
		return it && it.$ref;
	}

	function isScope(it) {
		return typeof it === 'object';
	}

	function T() {};

	function delegate(prototype) {
		T.prototype = prototype;
		return new T();
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
	function instantiate(ctor, args) {
		
		if(isConstructor(ctor)) {
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
		for(p in func.prototype) {
			if(p !== undef) {
				is = true;
				break;
			}
		}
		
		return is;
	}

	/*
		Function: whenA
		Return a promise that will resolve when and only
		when all of the supplied promises resolve.  The
		resolution value will be an array containing the
		resolution values of the triggering promises.
		TODO: Figure out the best strategy for rejecting.
	*/
	function whenAll(promises) {
		var toResolve, values, deferred;

		toResolve = promises.length;
		
		// Resolver for promises.  Captures the value and resolves
		// the returned promise when toResolve reaches zero.
		// Overwrites resolver var with a noop once promise has
		// be resolved to cover case where n < promises.length
		// var resolver = function handleResolve(val) {
		function resolver(val) {
			values.push(val);
			if(--toResolve === 0) {
				resolver = progress = noop;
				deferred.resolve(values);
			}
		}

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
		function rejecter(err) {
			rejecter = progress = noop;
			deferred.reject(err);			
		}

		// Wrapper so that rejecer can be replaced
		function reject(err) {
			rejecter(err);
		}

		// Progress updater.  Since this may be called many times,
		// can't overwrite it until resolve/reject.  So, it is
		// overwritten in resolve(), and reject().
		function progress(update) {
			deferred.progress(update);
		}

		deferred = Deferred();
		values = [];

		if(toResolve == 0) {
			deferred.resolve(values);

		} else {
			for (var i = 0; i < promises.length; i++) {
				when(promises[i]).then(resolve, reject, progress);
			}

		}
		
		return deferred;
	}

	function when(promiseOrValue) {
		if(isPromise(promiseOrValue)) {
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

	//
	// The following Deferred promise implementation is from when.js:
	// https://github.com/briancavalier/when.js
	//

	function noop() {};

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
		var deferred, promise, resolver, result, listeners, tail;

		function _then(callback, errback, progback) {
			var d, listener;

			listener = {
				deferred: (d = Deferred()),
				resolve: callback,
				reject: errback,
				progress: progback
			};

			if(listeners) {
				// Append new listener if linked list already initialized
				tail = tail.next = listener;
			} else {
				// Init linked list
				listeners = tail = listener;
			}

			return d.promise;
		}

		function then(callback, errback, progback) {
			return _then(callback, errback, progback);
		}

		function resolve(val) { 
			complete('resolve', val);
		}

		function reject(err) {
			complete('reject', err);
		}
		
		function _progress(update) {
			var listener, progress;
			
			listener = listeners;

			while(listener) {
				progress = listener.progress;
				progress && progress(update);
				listener = listener.next;
			}
		}

		function progress(update) {
			_progress(update);
		}

		function complete(which, val) {
			// Save original thenImpl
			var origThen = _then;

			// Replace thenImpl with one that immediately notifies
			// with the result.
			_then = function newThen(callback, errback) {
				var promise = origThen(callback, errback);
				notify(which, result);
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
			notify(which, val);
		}

		function notify(which, val) {
			// Traverse all listeners registered directly with this Deferred,
			// also making sure to handle chained thens
			while(listeners) {
				var listener, ldeferred, newResult, handler;

				listener  = listeners;
				ldeferred = listener.deferred;
				listeners = listeners.next;

				handler = listener[which];
				if(handler) {
					try {
						newResult = handler(result);

						if(isPromise(newResult)) {
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
						// console.error(e);
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
		promise = deferred.promise  = {
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
})(window);