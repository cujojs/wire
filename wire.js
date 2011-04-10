/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: wire.js
*/

(function(global, undef){

	"use strict";

	var VERSION = "0.5",
        tos = Object.prototype.toString,
		doc = global.document,
		head = doc.getElementsByTagName('head')[0],
		scripts = doc.getElementsByTagName('script'),
        loader = global['require'],
        domReady = loader.ready,
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

    var w = global['wire'] = wire;
    w.version = VERSION;

	// WARNING: Probably unsafe. Just for testing right now.
	// TODO: Only do this for browser env
	
	// Find our script tag and look for data attrs
	for(var i=0; i<scripts.length; i++) {
		var script, specUrl;

		script = scripts[i];
		
		if((specUrl = script.getAttribute('data-wire-spec'))) {
			// Use loader to load the wiring spec
			loader([specUrl]);
		}
	}


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
    		loader([spec], doWireContext);
    	} else {
    		doWireContext(spec);
    	}

		return promise;
	}

	function createScope(scopeDef, parent) {
		var scope, local, objects, resolvers, factories, aspects, setters,
			moduleLoadPromises, modulesReady, scopeReady, scopeDestroyed,
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

		factories.wire$literal = literalFactory;
		factories.module = factories.create = moduleFactory;

		moduleLoadPromises = [];
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

		if(parent.destroyed) {
			parent.destroyed.then(destroy);
		}

		promises = [];

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
		chain(whenAll(moduleLoadPromises), modulesReady);

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
				created = resolveRef(name, val);

			} else if(isArray(val)) {
				created = createArray(val);

			} else if(isStrictlyObject(val)) {
				created = processObject(val);

			} else {
				// Plain value
				created = val;
			}

			return chain(when(created), newPromise());
		}

		function loadModule(moduleId, spec) {
			var promise = newPromise();

			moduleLoadPromises.push(promise);

			loader(resolveModuleName(moduleId), function(module) {
				scanPlugin(module, spec);
				promise.resolve(module);
			});

			return promise;
		}

		function resolveModuleName(moduleIdOrAlias) {
			return [moduleIdOrAlias];
		}

		function scanPlugin(module, spec) {
			if(typeof module == 'object' && isFunction(module.wire$plugin)) {
				var plugin = module.wire$plugin(scopeReady, scopeDestroyed, spec);
				if(plugin) {
					addPlugin(plugin.resolvers, resolvers);
					addPlugin(plugin.aspects, aspects);

					if(plugin.setters) {
						setters = plugin.setters.concat(setters);
					}					
				}
			}
		}

		function addPlugin(src, registry) {
			for(var name in src) {
				if(registry[name]) {
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
						itemPromise.then(
							function(realItem) {
								result[i] = realItem;
							}
						);					
					})(i);
				}
				
				chain(whenAll(promises), promise, result);
			}

			return promise;
		}

		function processObject(spec) {
			var promise = newPromise();

			var factory = findFactory(spec);

			factory(spec, promise);			

			return promise;
		}

		function findFactory(spec) {
			for(var f in factories) {
				if(spec.hasOwnProperty(f)) {
					return factories[f];
				}
			}
			
			return scopeFactory;			
		}

		//
		// Factories
		//

		function scopeFactory(spec, promise) {
			return createScope(spec, scope).then(function(created) {
				promise.resolve(created.local);
			});
		}

	    function literalFactory(spec, promise) {
			delete spec.wire$literal;
			promise.resolve(spec);    	
	    }

		function moduleFactory(spec, promise) {
			var moduleId, update, created, configured, initialized;
			
			moduleId = spec.create 
				? typeof spec.create == 'string' ? spec.create : spec.create.module
				: spec.module;

			update = { spec: spec };
			created     = update.created     = newPromise();
			configured  = update.configured  = newPromise();
			initialized = update.initialized = newPromise();

			// After the object has been created, update progress for
			// the entire scope, then process the post-created aspects
			created.then(function(object) {
				// TODO: scopeReady progress update should have a richer
				// update object containing info about the status, wire API, etc.
				scopeReady.progress(update);
				chain(processAspects('created', object), configured);
			});

			// After the object is configured, process the post-configured
			// aspects.
			configured.then(function(object) {
				chain(processAspects('configured', object), initialized);
			});

			// After the object is initialized, process the post-initialized
			// aspects.
			initialized.then(function(object) {
				chain(processAspects('initialized', object), promise);
			});

			// Load the module, and use it to create the object
			loadModule(moduleId, spec).then(function(module) {
				// We'll either use the module directly, or we need
				// to instantiate/invoke it.
				if(spec.create && isFunction(module)) {
					// Instantiate or invoke it and use the result
					chain(create(module), created);

				} else {
					// Simply use the module as is
					created.resolve(module);
					
				}
			});

			return promise;

			//
			// ModuleFactory private functions
			//

			function create(module) {
				var args, promise;
				
				args = [];
				promise = newPromise();

				if(typeof spec.create == 'object' && spec.create.args) {
					args = isArray(spec.create.args) ? spec.create.args : [spec.create.args];
				}

				when(modulesReady).then(function() {
					createArray(args).then(function(resolvedArgs) {
						var object = instantiate(module, resolvedArgs);

						chain(processAspects(spec, object), promise);
					});						
				});

				return promise;
			}

			function processAspects(step, target) {
				var promises, aspect, options;

				promises = [];

				for(var a in aspects) {
					aspect = aspects[a];
					options = spec[a];
					if(options && aspect && aspect[step]) {
						var aspectPromise = newPromise();
						promises.push(aspectPromise);
						aspect[step](target, options, aspectPromise);
					}
				}

				return chain(whenAll(promises), newPromise(), target);

			}
		}

		//
		// Reference resolution
		//

		function resolveRef(name, ref) {
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
							resolver(refName, refObj, { domReady: domReady }, promise);
					
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

	function getKeys(obj) {
		var k = [];
		for(var p in obj) {
			if(obj.hasOwnProperty(p)) {
				k.push(p);
			}
		}
		
		return k;
	}

	function fake(val) {
		return when(val);
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
				function () { throw new Error('Promise already completed.'); };

			// complete all waiting (async) then()s
			var aThen,
				i = 0;
			while (aThen = this._thens[i++]) { aThen[which] && aThen[which](arg); }
			delete this._thens;
			delete this._progress;
		}
	};
})(window);