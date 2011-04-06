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
        loader = global['require'],
        domReady = loader.ready,
        rootContext,
        rootSpec = global['wire']||{ zzz: "parent" };

    function wire(spec) {
   		var promise = new Promise();

   		// If the root context is not yet wired, wire it first
   		if(!rootContext) {
   			rootContext = wireContext(rootSpec);
   		}

   		// Use the rootContext to wire all new contexts.
		when(rootContext).then(
			function(root) {
				root.wire(spec).then(promise);
			}
		);

    	return promise;    	
    }

    var w = global['wire'] = wire;
    w.version = VERSION;

    function wireContext(spec, parent) {

    	var promise = new Promise();

		createScope(spec, parent).then(function(scope) {
			var context;
			
			context = scope.objects;

			function wireChildContext(spec) {
				return wireContext(spec, scope);
			};

			context.wire    = wireChildContext 
			context.resolve = scope.resolveRef;
			context.destroy = scope.destroy;
			
			promise.resolve(context);
		});

		return promise;
	}

	//
	// Private functions
	//
	
	function createScope(scopeDef, parent) {
		var scope, local, objects, resolvers, directives, factories, aspects, setters,
			moduleLoadPromises, modulesReady, scopeReady, scopeDestroyed,
			promises, name;
			

		// Empty parent scope if none provided
		parent = parent||{};

		local = {};

		// Descend scope and plugins from parent so that this scope can
		// use them directly via the prototype chain
		objects = delegate(parent.objects||{});
		resolvers = delegate(parent.resolvers||{});
		directives = delegate(parent.directives||{});
		aspects = delegate(parent.aspects||{});

		factories = delegate(parent.factories||{});

		// Setters is an array, have to concat
		setters = parent.setters ? [].concat(parent.setters) : [];

		factories.wire$literal = literalFactory;
		factories.module = factories.create = moduleFactory;

		moduleLoadPromises = [];
		modulesReady = new Promise();

		scopeReady = new Promise();
		scopeDestroyed = new Promise();

		// A proxy of this scope that can be used as a parent to
		// any child scopes that may be created.
		scope = {
			local: local,
			objects: objects,
			resolvers: resolvers,
			directives: directives,
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
			var p = objects[name] = new Promise();
			promises.push(p);
		}


		// When all scope item promises are resolved, the scope
		// is resolved.
		whenAll(promises).then(scopeReady, scope);

		// Process/create each item in scope and resolve its
		// promise when completed.
		for(name in scopeDef) {
			createScopeItem(name, scopeDef[name], objects[name]);
		}

		// Once all modules have been loaded, resolve modulesReady
		whenAll(moduleLoadPromises).then(modulesReady);

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

			} else if(name && isDirective(name, val)) {
				created = execDirective(name, val);

			} else if(typeof val == 'object') {
				var factory = findFactory(val);

				if(factory) {
					created = createModule(val, factory);

				} else {
					created = new Promise();
					createScope(val, scope).then(function(childScope) {
						created.resolve(childScope.local);
					});

				}

			} else {
				// Plain value
				created = val;
			}

			return when(created).then(new Promise());
		}

		function loadModule(moduleId, spec) {
			var promise = new Promise();

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
				var plugin = module.wire$plugin(scopeReady, spec);
				for(var name in plugin.resolvers) {
					if(resolvers.hasOwnProperty(name)) {
						throw new Error("Two resolvers for same type in scope: " + name);
					}

					resolvers[name] = plugin.resolvers[name];
				}

				if(plugin.setters) {
					setters = plugin.setters.concat(setters);
				}
			}
		}

		function createArray(arrayDef) {
			var promise, result;

			promise = new Promise();
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
				
				whenAll(promises).then(promise, result);
			}

			return promise;
		}

		function findFactory(spec) {
			for(var f in factories) {
				if(spec.hasOwnProperty(f)) {
					return factories[f];
				}
			}
			
			return false;			
		}

		function createModule(spec, factory) {
			var promise = new Promise();

			if(!factory) factory = findFactory(spec);

			if(factory) {
				factory(spec, promise);			
			} else {
				promise.reject(spec);
			}

			return promise;
		}

	    function literalFactory(spec, promise) {
			delete spec.wire$literal;
			promise.resolve(spec);    	
	    }

		function moduleFactory(spec, promise) {
			var moduleId = spec.create 
				? typeof spec.create == 'string' ? spec.create : spec.create.module
				: spec.module;


			loadModule(moduleId, spec).then(function(module) {
				// We'll either use the module directly, or we need
				// to instantiate/invoke it.
				if(spec.create && isFunction(module)) {
					// Instantiate or invoke it and use the result
					var args = [];
					if(typeof spec.create == 'object' && spec.create.args) {
						args = isArray(spec.create.args) ? spec.create.args : [spec.create.args];
					}

					when(modulesReady).then(function() {
						createArray(args).then(function(resolvedArgs) {
							var created = instantiate(module, resolvedArgs);
							promise.resolve(created);
						});						
					});

				} else {
					// Simply use the module as is
					promise.resolve(module);
					
				}
			});

			return promise;
		}

		function isDirective(name, spec) {
			return name in directives;
		}

		function execDirective(name, spec) {
			return fake(spec);
		}

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

				promise = new Promise();
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
		return tos.call(it) === '[object Array]';
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
		Function: whenN
		Return a promise that will resolve when and only
		when N of the supplied promises resolve.  The
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
				resolver = noop;
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
			rejecter = noop;
			promise.reject(err);			
		}

		// Wrapper so that rejecer can be replaced
		function reject(err) {
			rejecter(err);
		}

		promise = new Promise();
		values = [];

		if(toResolve == 0) {
			promise.resolve(values);

		} else {
			for (var i = 0; i < promises.length; i++) {
				when(promises[i]).then(resolve, reject);
			}

		}
		
		return promise;
	}

	function when(promiseOrValue) {
		if(isPromise(promiseOrValue)) {
			return promiseOrValue;
		}

		var p = new Promise();
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
			if(isPromise(onResolve)) {
				// Chain promise
				this.then(
					function(val)    { onResolve.resolve(onReject ? onReject : val); },
					function(err)    { onResolve.reject(err); },
					function(update) { onResolve.progress(update); }
				);

				return onResolve;
			} else {
				// capture calls to then()
				this._thens.push({ resolve: onResolve, reject: onReject, progress: onProgress });
				onProgress && this._progress.push(onProgress);	
				return this;
			}

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
			var i=0,
				p;
			while(p = this._progress[i++]) { p(statusObject); }
		},

		/* "Private" methods. */

		_complete: function (which, arg) {
			// switch over to sync then()
			this.then = which[2] === 'j'
				? function (resolve, reject) {
					if(isPromise(resolve)) {
						resolve.reject(arg);
						return resolve;
					} else if(reject) {
						reject(arg);
					}

					return this;
				}
                : function (resolve) {
                	if(isPromise(resolve)) {
                		resolve.resolve(arg);
                		return resolve;
                	} else if(resolve) {
                		resolve(arg);
                	}
					
					return this;
				};
            // disallow multiple calls to resolve or reject
			this.resolve = this.reject = this.progress =
				function () { throw new Error('Promise already completed.'); };

			// complete all waiting (async) then()s
			var aThen,
				i = 0;
			while (aThen = this._thens[i++]) { aThen[which] && aThen[which](arg); }
			delete this._thens;
		}
	};
})(window);