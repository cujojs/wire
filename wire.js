/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: wire.js
*/

(function(global, undef){
define(['require'], function(require) {

	"use strict";

	var VERSION = "0.5",
        tos = Object.prototype.toString,
		doc = global.document,
		head = doc.getElementsByTagName('head')[0],
		scripts = doc.getElementsByTagName('script'),
        rootContext,
        rootSpec = global['wire']||{};

    //
    // Public API
    //

    function wire(spec) {
   		var promise = newPromise();

   		// If the root context is not yet wired, wire it first
   		if(!rootContext) {
   			rootContext = wireContext(rootSpec);
   		}

   		// Use the rootContext to wire all new contexts.
		when(rootContext).then(
			function(root) {
				chain(root.wire(spec), promise);
			}
		);

    	return promise;    	
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

    	var promise = newPromise();

    	// Function to do the actual wiring.  Capture the
    	// parent so it can be called after an async load
    	// if spec is an AMD module Id string.
    	function doWireContext(spec) {
			createScope(spec, parent).then(function(scope) {
				var context;
				
				context = scope.objects;

				function wireChildContext(spec) {
					return wireContext(spec, scope);
				};

				context.wire    = wireChildContext;
				context.resolve = scope.resolveRef;
				context.destroy = scope.destroy;
				
				promise.resolve(context);
			});
    	}

    	// If spec is a module Id, load it, then wire it.
    	// If it's a spec object, wire it now.
    	if(typeof spec == 'string') {
    		require([spec], doWireContext);
    	} else {
    		doWireContext(spec);
    	}

		return promise;
	}

	function createScope(scopeDef, parent) {
		var scope, local, objects, resolvers, factories, aspects, setters,
			modulesToLoad, moduleLoadPromises, modulesReady, scopeReady, scopeDestroyed,
			promises, name;
			

		// Empty parent scope if none provided
		parent = parent||{};

		local = {};

		// Descend scope and plugins from parent so that this scope can
		// use them directly via the prototype chain
		objects = delegate(parent.objects||{});
		resolvers = delegate(parent.resolvers||{});
		aspects = delegate(parent.aspects||{});

		factories = delegate(parent.factories||{});

		// Setters is an array, have to concat
		setters = parent.setters ? [].concat(parent.setters) : [];

		modulesToLoad = [];
		moduleLoadPromises = {};
		modulesReady = newPromise();

		scopeReady = newPromise();
		scopeDestroyed = newPromise();

		// A proxy of this scope that can be used as a parent to
		// any child scopes that may be created.
		scope = {
			local: local,
			objects: objects,
			resolvers: resolvers,
			aspects: aspects,
			factories: factories,
			setters: setters,
			resolveRef: doResolveRef,
			destroy: destroy,
			destroyed: scopeDestroyed
		};

		function pluginApi(spec) {
			return createItem(spec);
		}

		pluginApi.load = loadModule;
		pluginApi.resolveRef = doResolveRef;
		pluginApi.promise = newPromise;
		pluginApi.when = when;
		pluginApi.whenAll = whenAll;

		if(parent.destroyed) {
			parent.destroyed.then(destroy);
		}

		promises = [];

		loadModule('wire/base');

		// Setup a promise for each item in this scope
		for(name in scopeDef) {
			var p = objects[name] = newPromise();
			promises.push(p);
		}

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

		function createScopeItem(name, val, itemPromise) {
			createItem(val, name).then(function(resolved) {
				objects[name] = local[name] = resolved;
				itemPromise.resolve(resolved);
			});			
		}

		function createItem(val, name) {
			var created;
			
			if(isRef(val)) {
				created = resolveRef(val, name);

			} else if(isArray(val)) {
				created = createArray(val);

			} else if(isStrictlyObject(val)) {
				if(val.module) {
					created = loadModule(val.module, val)
				} else {
					created = processObject(val);
				}

			} else {
				// Plain value
				created = val;
			}

			return chain(when(created), newPromise());
		}

		function loadModule(moduleId, spec) {
			var promise, m;

			m = moduleLoadPromises[moduleId]

			if(!m) {
				modulesToLoad.push(moduleId);
				m = moduleLoadPromises[moduleId] = { id: moduleId };
				promise = m.promise = new Promise();

				moduleLoadPromises[moduleId] = m;

				require([moduleId], function(module) {
					scanPlugin(module, spec);
					m.module = module;
					chain(modulesReady, promise, m.module);
				});
			}

			return m.promise;
		}

		function scanPlugin(module, spec) {
			if(typeof module == 'object' && isFunction(module.wire$plugin)) {
				var plugin = module.wire$plugin(scopeReady, scopeDestroyed, spec);
				if(plugin) {
					addPlugin(plugin.resolvers, resolvers);
					addPlugin(plugin.factories, factories);
					addPlugin(plugin.aspects, aspects);

					if(plugin.setters) {
						setters = plugin.setters.concat(setters);
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

			promise = newPromise();
			result = [];

			if(arrayDef.length === 0) {
				promise.resolve(result);

			} else {
				var promises = [];

				for (var i = 0; i < arrayDef.length; i++) {
					var itemPromise = result[i] = createItem(arrayDef[i]);
					promises.push(itemPromise);

					(function(i) {
						// Capture i, assign resolved array item into array
						itemPromise.then(function(realItem) {
							result[i] = realItem;
						});
					})(i);
				}
				
				chain(whenAll(promises), promise, result);
			}

			return promise;
		}

		function processObject(spec) {
			var promise, proxy, update, created, configured, initialized;
			
			promise = newPromise();

			proxy = {};

			update = { spec: spec };
			created     = update.created     = newPromise();
			configured  = update.configured  = newPromise();
			initialized = update.initialized = newPromise();

			// FIXME: Should not have to wait for all modules to load,
			// but rather only the module containing the particular
			// factory we need.  But how to know which factory before
			// they are all loaded?
			// Maybe need a special syntax for factories, something like:
			// create: "factory!whatever-arg-the-factory-takes"
			// args: [factory args here]
			modulesReady.then(function() {
				var factory = findFactory(spec);
				factory(created, spec, pluginApi);

				// After the object has been created, update progress for
				// the entire scope, then process the post-created aspects
				created.then(function(object) {
					initProxy(proxy, object);

					scopeReady.progress(update);
					chain(processAspects('created', proxy, spec), configured);
				});

				// After the object is configured, process the post-configured
				// aspects.
				configured.then(function(object) {
					chain(processAspects('configured', proxy, spec), initialized);
				});

				// After the object is initialized, process the post-initialized
				// aspects.
				initialized.then(function(object) {
					chain(processAspects('initialized', proxy, spec), promise);
				});				
			});

			return promise;
		}

		function initProxy(proxy, object) {
			var cachedSetter;

			function setProp(prop, value) {
				if(!(cachedSetter && cachedSetter(object, prop, value))) {
					var success = false,
						s = 0;

					// Try all the registered setters until we find one that reports success
					while(!success && s<setters.length) {
						var setter = setters[s++];
						success = setter(object, prop, value);
						if(success) {
							cachedSetter = setter;
						}
					}
				}
			}

			proxy.target = object;
			proxy.set    = setProp;
			// TODO: Add get() and invoke() to provide a generic interface to
			// getting a prop value and invoke a method?
		}

		function findFactory(spec) {
			for(var f in factories) {
				if(spec.hasOwnProperty(f)) {
					return factories[f];
				}
			}
			
			return spec.module ? moduleFactory : scopeFactory;			
		}

		function processAspects(step, target, spec) {
			var promises, aspect, aspectApi, aspectProcessor, options;

			promises = [];
			// aspectApi = delegate(pluginApi);
			aspectApi = pluginApi;
			aspect = delegate(target);

			for(var a in aspects) {
				aspectProcessor = aspects[a];
				options = aspect.options = spec[a];

				if(options && aspectProcessor && aspectProcessor[step]) {
					var aspectPromise = newPromise();
					promises.push(aspectPromise);
					aspectProcessor[step](aspectPromise, aspect, aspectApi);
				}
			}

			return chain(whenAll(promises), newPromise(), target.target);

		}

		//
		// Factories
		//

		function scopeFactory(promise, spec, wire) {
			return createScope(spec, scope).then(function(created) {
				promise.resolve(created.local);
			});
		}

		//
		// Reference resolution
		//

		function resolveRef(ref, name) {
			var refName = ref.$ref;

			// Punt on this for now.  Should be able to make it work.
			if(name === refName) {
				throw new Error("Self-references not allowed: " + name);
			}

			return doResolveRef(refName, ref);
		}

		function doResolveRef(refName, refObj) {
			var promise;

			if(refName in objects) {
				promise = objects[refName];

			} else {
				var split;

				promise = newPromise();
				split = refName.indexOf('!');

				if(split > 0) {

					// Wait for modules, since the reference may need to be
					// resolved by a plugin
					when(modulesReady).then(function() {

						var resolver = resolvers[refName.substring(0, split)];
						if(resolver) {
							refName = refName.substring(split+1);
							// TODO: real ref plugin api
							resolver(promise, refName, refObj, pluginApi);
					
						} else {
							promise.reject("No resolver found for ref: " + refObj);
					
						}
						
					});
				} else {
					promise.reject("Cannot resolve ref: " + refName);
				}

			}

			return promise;
		}

		//
		// Destroy
		//

		function destroy() {
			function doDestroy() {
				// Invoke all registered destroy functions
				// for (var i=0; i < destroyers.length; i++) {
				// 	try {
				// 		destroyers[i]();
				// 	} catch(e) {
				// 		/* squelch? */
				// 		console.log(e);
				// 	}
				// }
				
				// TODO: Clear out the context prototypes?
				var p;
				for(p in scope)   delete scope[p];
				for(p in objects) delete objects[p];
				for(p in local)   delete local[p];
				
				// But retain a do-nothing destroy() func, in case
				// it is called again for some reason.
				doDestroy = noop;

				// Resolve promise
				scopeDestroyed.resolve();
			}
			
			scopeReady.then(doDestroy, doDestroy);

			return scopeDestroyed;

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
	
	function noop() {};

	/*
		Function: whenA
		Return a promise that will resolve when and only
		when all of the supplied promises resolve.  The
		resolution value will be an array containing the
		resolution values of the triggering promises.
		TODO: Figure out the best strategy for rejecting.
	*/
	function whenAll(promises) {
		var toResolve, values, promise;

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
				promise.resolve(values);
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
			promise.reject(err);			
		}

		// Wrapper so that rejecer can be replaced
		function reject(err) {
			rejecter(err);
		}

		// Progress updater.  Since this may be called many times,
		// can't overwrite it until resolve/reject.  So, it is
		// overwritten in resolve(), and reject().
		function progress(update) {
			promise.progress(update);
		}

		promise = newPromise();
		values = [];

		if(toResolve == 0) {
			promise.resolve(values);

		} else {
			for (var i = 0; i < promises.length; i++) {
				when(promises[i]).then(resolve, reject, progress);
			}

		}
		
		return promise;
	}

	function when(promiseOrValue) {
		if(isPromise(promiseOrValue)) {
			return promiseOrValue;
		}

		var p = newPromise();
		p.resolve(promiseOrValue);
		return p;
	}

	function isPromise(promiseOrValue) {
		return promiseOrValue && isFunction(promiseOrValue.then);
	}
		
	/*
		Section: Promise Helpers
		Helper functions for <Promises>
	*/
	/*
		Function: safe
		Returns a "safe" version of the supplied <Promise> that only has a then() function.
		
		Parameters:
			promise - a <Promise> or safe <Promise>
			
		Returns:
		a safe <Promise> that only has then()
	*/
	function safe(promise) {
		return {
			then: function safeThen(resolve, reject, progress) {
				promise.then(resolve, reject, progress);
			}
		};
	}
	
	/*
		Function: reject
		Creates a Function that, when invoked, will reject the supplied <Promise>
		
		Parameters:
			promise - <Promise> to reject
			
		Returns:
		a Function that, when invoked, will reject the supplied <Promise>
	*/
	function reject(promise) {
		return function(err) {
			promise.reject(err);
		};
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

	function newPromise() {
		return new Promise();
	}
	
	/*
		Class: Promise
		Promise implementation based on unscriptable's minimalist Promise
		https://gist.github.com/814052/
		with safe mod and progress by me:
		https://gist.github.com/814313
	*/
	/*
		Constructor: Promise
		Creates a new Promise
	*/
	
	function Promise () {
		this._thens = [];
		this._progress = [];
	}

	Promise.prototype = {

		/* This is the "front end" API. */

		// then(onResolve, onReject): Code waiting for this promise uses the
		// then() method to be notified when the promise is complete. There
		// are two completion callbacks: onReject and onResolve. A more
		// robust promise implementation will also have an onProgress handler.
		then: function (onResolve, onReject, onProgress) {
			// capture calls to then()
			this._thens.push({ resolve: onResolve, reject: onReject });
			onProgress && this._progress.push(onProgress);	
			return this;
		},

		// Some promise implementations also have a cancel() front end API that
		// calls all of the onReject() callbacks (aka a "cancelable promise").
		// cancel: function (reason) {},

		/* This is the "back end" API. */

		// resolve(resolvedValue): The resolve() method is called when a promise
		// is resolved (duh). The resolved value (if any) is passed by the resolver
		// to this method. All waiting onResolve callbacks are called
		// and any future ones are, too, each being passed the resolved value.
		resolve: function (val) { this._complete('resolve', val); },

		// reject(exception): The reject() method is called when a promise cannot
		// be resolved. Typically, you'd pass an exception as the single parameter,
		// but any other argument, including none at all, is acceptable.
		// All waiting and all future onReject callbacks are called when reject()
		// is called and are passed the exception parameter.
		reject: function (ex) { this._complete('reject', ex); },

		// Some promises may have a progress handler. The back end API to signal a
		// progress "event" has a single parameter. The contents of this parameter
		// could be just about anything and is specific to your implementation.
		
		progress: function(statusObject) {
			var i = 0, p;
			while(p = this._progress[i++]) { p(statusObject); }
		},

		/* "Private" methods. */

		_complete: function (which, arg) {
			// switch over to sync then()
			this.then = which === 'reject'
				? function (resolve, reject) { reject && reject(arg); return this; }
				: function (resolve) { resolve && resolve(arg); return this; };
            // disallow multiple calls to resolve or reject
			this.resolve = this.reject = this.progress =
				function () { 
					throw new Error('Promise already completed.');
				};

			// complete all waiting (async) then()s
			var aThen,
				i = 0;
			while (aThen = this._thens[i++]) { aThen[which] && aThen[which](arg); }
			delete this._thens;
			delete this._progress;
		}
	};
	
	return wire;
});
})(window, typeof define != 'undefined' ? define : function(deps, factory){
    // global when, if not loaded via require
    this.wire = factory(require);
});