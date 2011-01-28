/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

//
// TODO:
// - Allow easier loading of modules that don't actually need to be references, like dijits that
//    might be used for data-dojo-type
//
(function(global, undef){
	"use strict";

	var VERSION = "0.1",
		wirePrefix = 'wire$',
		tos = Object.prototype.toString,
		arrt = '[object Array]',
		doc = global.document,
		head = doc.getElementsByTagName('head')[0],
		scripts = doc.getElementsByTagName('script'),
		// Hook up to require
		loadModules = global['require'],
		getLoadedModule = loadModules, // this may be requirejs specific
		onDomReady = loadModules.ready, // this is requirejs specific
		rootSpec = global.wire || {},
		defaultModules = ['wire/base'],
		rootContext;
		
	/*
	 * Helpers
	 */
	
	function isArray(it) {
		return tos.call(it) === '[object Array]';
	}
	
	function isFunction(it) {
		return typeof it == 'function';
	}
	
	function keys(obj) {
		var k = [];
		for(var p in obj) {
			if(obj.hasOwnProperty(p)) {
				k.push(p);
			}
		}
		
		return k;
	}

	function mixin(dst, src) {
		for(var p in src) {
			dst[p] = src[p];
		}

		return dst;
	}
	
	function getModule(spec) {
		return spec.create
			? (typeof spec.create == 'string' ? spec.create : spec.create.module)
			: spec.module;
	}
	
	function isRef(spec) {
		return spec && spec.$ref !== undef;
	}
	
	var F = function F(ctor, args) {
			return ctor.apply(this, args);
		};

	function instantiate(ctor, args) {
		var k = keys(ctor.prototype);
		if(k.length === 0) {
			return ctor.apply(null, args);
		} else {
			F.prototype = ctor.prototype;
			F.prototype.constructor = ctor;
			return new F(ctor, args);
		}
	}
	
	function createResolver(remaining, object, prop, promise) {
		return function resolver(result) {
			object[prop] = result;
			if(remaining == 0) {
				promise.resolve(object);
			}
		};
	}
	
	function processFuncList(list, target, spec, callback) {
		var func;
		if(typeof list == "string") {
			func = target[list];
			if(isFunction(func)) {
				callback(target, spec, func, []);
			}
		} else {
			for(var f in list) {
				func = target[f];
				if(isFunction(func)) {
					callback(target, spec, func, list[f]);
				}
			}
		}
	}
	
	var Promise = function() {
		this.completed = 0;
		this.chain = [];
	};
	
	Promise.prototype = {
		
		then: function(resolved, rejected, progress) {
			var completed = this.completed,
				result = this.result;
				
			if(completed > 0) {
				if(resolved) resolved(result);
				
			} else if(completed < 0) {
				if(rejected) rejected(result);
				
			} else {
				this.chain.push({ resolve: resolved, reject: rejected, progress: progress });

			}

			return this;
		},
		
		resolve: function(value) {
			return this.complete(value, 1);
		},
		
		reject: function(value) {
			return this.complete(value, -1);
		},
		
		complete: function(value, completeType) {
			if(this.completed) throw Error("Promise already completed");
			
			this.completed = completeType;
			var action = completeType > 0 ? 'resolve' : 'reject',
				res = this.result = value,
				chain = this.chain,
				self = this,
				newResult;
		
			for(var i=0; i<chain.length; i++) {
				try {
					var c = chain[i],
						func = c[action];
						
					if(isFunction(func)) {
						newResult = func(res);
						
						if(newResult !== undef) {
							res = newResult;
						}
					} else if(action === 'reject') {
						throw res;
					}
				} catch(e) {
					// console.log("Promise ERROR", e, this);
					res = e;
					this.completed = -1;
					action = 'reject';
				}
			}
			
			return this.result;
		},
		
		progress: function(statusObject) {
			var chain = this.chain;
			for(var i=0; i<chain.length; i++) {
				try {
					var c = chain[i];
					if(c.progress) {
						c.progress(statusObject);
					}
				} catch(e) {
					this.reject(e);
				}
			}
		}
	};
	
	function safe(promise) {
		return {
			then: function safeThen(resolve, reject, progress) {
				return promise.then(resolve, reject, progress);
			}
		};
	}
	
	function reject(promise) {
		return function(err) {
			promise.reject(err);
		};
	}
	
	var Context = function() {};
	
	function contextFactory(parent) {
		return (function(parent) {
			// Use the prototype chain for context parent-child
			// relationships
			if(parent) Context.prototype = parent.context;
			var context = new Context(),
				uniqueModuleNames = {},
				// Top-level promises
				modulesReady = new Promise(),
				objectsCreated = new Promise(),
				objectsReady = new Promise(),
				contextReady = new Promise(),
				contextDestroyed = new Promise(),
				domReady = new Promise(),
				// Plugins
				setters = [],
				resolvers = {},
				listeners = {
					onContextInit: [],
					onContextError: [],
					onContextReady: [],
					onContextDestroy: [],
					onCreate: [],
					onProperties: [],
					onInit: [],
					onDestroy: []
				},
				// Proxy of this factory that can safely be passed to plugins
				pluginProxy = {
					modulesReady: safe(modulesReady),
					objectsCreated: safe(objectsCreated),
					objectsReady: safe(objectsReady),
					contextReady: safe(contextReady),
					domReady: safe(domReady),
					contextDestroyed: safe(contextDestroyed),
					resolveName: function(name) {
						return context[name];
					},
					resolveRef: function(ref) {
						return resolveRef(ref);
					},
					setProperties: function(object, props) {
						return setProperties(object, props);
					}
				},
				// Track destroy functions to be called when context is destroyed
				destroyers = [],
				// Counters for objects to create and init so that promises
				// can be resolved when all are complete
				objectsToCreate = 0,
				objectCreateCount = 0,
				objectsToInit = 0,
				objectInitCount = 0;

			
			// Mixin default modules
			for(var i=0; i<defaultModules.length; i++) {
				uniqueModuleNames[defaultModules[i]] = 1;
			}
			
			function resolveRefObj(refObj, promise) {
				var ref = refObj.$ref,
					prefix = "_",
					name = ref;

				if(ref.indexOf("!") >= 0) {
					var parts = ref.split("!");
					prefix = parts[0];
				    name = parts[1];
				}

				var promiseProxy = {
					resolve: function resolvePromise(resolved) {
						promise.resolve(resolved);
					}
				};

				promiseProxy.unresolved = (parent)
					? function tryParent() {
						parent.resolveRefObj(refObj, promise);
					}
					: function rejectPromise() {
						promise.reject("Can't resolve reference " + name);
					};

				if(resolvers[prefix]) {
					resolvers[prefix](pluginProxy, name, refObj, promiseProxy);

				} else {
					promiseProxy.unresolved();

				}
			}

			function resolveRef(ref) {
				// console.log("Trying to resolve", ref);
				var p = new Promise();

				if(isRef(ref)) {
					modulesReady.then(function resolveRefAfterModulesReady() {
						resolveRefObj(ref, p);
					});
				} else {
					p.resolve(ref);
				}
				return p;
			}

			function createObject(spec, module) {
				var p = new Promise(),
					object = module;

				function objectCreated(obj, promise) {
					modulesReady.then(function handleModulesReady() {
						objectsCreated.progress({ object: obj, spec: spec });
						promise.resolve(obj);
					});
				}

				try {
					if(spec.create && isFunction(module)) {
						var args = [];
						if(typeof spec.create == 'object' && spec.create.args) {
							args = isArray(spec.create.args) ? spec.create.args : [spec.create.args];
						}

						parse(args).then(
							function handleCreateParsed(resolvedArgs) {
								objectCreated(instantiate(module, resolvedArgs), p);
							},
							reject(p)
						);
					} else {
						objectCreated(object, p);
					}

				} catch(e) {
					p.reject(e);
				}

				return p;
			}

			function initObject(spec, object) {
				var promise = new Promise();

				function resolveObjectInit() {
					if(spec.init) {
						processFuncList(spec.init, object, spec,
							function handleProcessFuncList(target, spec, func, args) {
								callInit(target, spec, func, args).then(
									function() {
										promise.resolve(object);
									}
								);
							}
						);
					} else {
						promise.resolve(object);
					}
				}

				if(spec.properties) {
					setProperties(object, spec.properties).then(
						resolveObjectInit,
						reject(promise)
					);
				} else {
					resolveObjectInit();
				}


				if(spec.destroy) {
					destroyers.push(function doDestroy() {
						processFuncList(spec.destroy, object, spec, function(target, spec, func, args) {
							func.apply(target, []); // no args for destroy
						});
					});
				}

				return promise;
			}

			function setProperties(object, props) {
				var promise = new Promise(),
					keyArr = keys(props),
					cachedSetter;

				var count = keyArr.length;
				for(var i=0; i<keyArr.length; i++) {
					var name = keyArr[i];
					(function(name, prop) {
						parse(prop).then(function handlePropertiesParsed(value) {
							// If we previously found a working setter for this target, use it
							if(!(cachedSetter && cachedSetter(object, name, value))) {
								var success = false,
									s = 0;

								// Try all the registered setters until we find one that reports success
								while(!success && s<setters.length) {
									var setter = setters[s++];
									success = setter(object, name, value);
									if(success) {
										cachedSetter = setter;
									}
								}
							}

							if(--count === 0) {
								fireEvent('onProperties', object, props);
								promise.resolve(object);
							}
						}, reject(promise));
					})(name, props[name]);
				}

				return promise;
			}

			function callInit(target, spec, func, args) {
				return parse(args).then(function handleInitParsed(processedArgs) {
					func.apply(target, isArray(processedArgs) ? processedArgs : [processedArgs]);
					fireEvent('onInit', target, spec);
				});
			}

			function loadModule(moduleId) {
				var p = new Promise();

				if(!uniqueModuleNames[moduleId]) {
					uniqueModuleNames[moduleId] = 1;
					loadModules([moduleId], function handleModulesLoaded(module) {
						uniqueModuleNames[moduleId] = module;
						p.resolve(module);
					});

				} else {
					modulesReady.then(function handleModulesReady() {
						p.resolve(uniqueModuleNames[moduleId]);
					});

				}

				return p;
			}

			function scanPlugins(modules) {
				// console.log("scanning for plugins", modules);
				var p = new Promise();

				for (var i=0; i < modules.length; i++) {
					var newPlugin = modules[i];
					// console.log("scanning for plugins: " + newPlugin);
					if(typeof newPlugin == 'object') {
						if(newPlugin.wire$resolvers) {
							for(var name in newPlugin.wire$resolvers) {
								resolvers[name] = newPlugin.wire$resolvers[name];
							}
						}

						if(newPlugin.wire$setters) {
							setters = newPlugin.wire$setters.concat(setters);
						}

						if(newPlugin.wire$listeners) {
							addEventListeners(newPlugin.wire$listeners);
						}

						if(isFunction(newPlugin.wire$init)) {
							// Have to init plugins immediately, so they can be used during wiring
							newPlugin.wire$init();
						}
					}
				}

				p.resolve(modules);
				return p;
			}

			function addEventListeners(listener) {
				for(var p in listeners) {
					if(isFunction(listener[p])) {
						listeners[p].push(listener);
					}
				}
			}

			function fireEvent(/* name, arg1, arg2... */) {
				var args = Array.prototype.slice.call(arguments),
					name = args.shift(),
					pluginsToCall = listeners[name];

				for(var i=0; i<pluginsToCall.length; i++) {
					var plugin = pluginsToCall[i];
					plugin[name].apply(plugin, args);
				}
			}

			function initFromParent(parent) {
				// mixin(context, parent.context);
				parent.contextDestroyed.then(function handleParentDestroyed() { destroy(); });
			}
			
			function initPromiseStages() {
				function rejectPromise(promise, message, err) {
					fireEvent('onContextError', context, message, err);
					reject(promise);
				};

				onDomReady(function resolveDomReady() {
					// console.log('domReady');
					domReady.resolve();
				});

				modulesReady.then(
					function resolveModulesReady(modules) {
						fireEvent('onContextInit', modules);
					},
					function rejectModulesReady(err) {
						rejectPromise(objectsCreated, "Module loading failed", err);
					});

				objectsCreated.then(
					null,
					function rejectObjectsCreated(err) {
						rejectPromise(objectsReady, "Object creation failed", err);
					},
					function progressObjectsCreated(status) {
						fireEvent("onCreate", status.object, status.spec);
					}
				);

				contextReady.then(
					function resolveContextReady(context) {
						fireEvent('onContextReady', context);
					}
				);
			}
			
			function finalizeContext(parsedContext) {
				parsedContext.wire = function wire(spec) {
					var newParent = {
						wire: wire,
						context: context,
						resolveRefObj: resolveRefObj,
						contextDestroyed: contextDestroyed
					};
					return contextFactory(newParent).wire(spec);
				};
				parsedContext.resolve = function resolve(ref) {
					return resolveName(ref).safe;
				};
				parsedContext.destroy = function destroyContext() {
					return destroy().safe;
				};

				if(objectsToCreate === 0) {
					objectsCreated.resolve(parsedContext);
				}

				if(objectsToInit === 0) {
					objectsReady.resolve(parsedContext);
				}

				objectsReady.then(function finalizeContextReady(readyContext) {
					// It should be possible not to have to wait for domReady
					// here, but rely on promise resolution.  For now, just wait
					// for it.
					domReady.then(function() {
						contextReady.resolve(readyContext);
					});
				});
			}

			function parse(spec, result) {
				var processed = spec,
					promise = new Promise(),
					count,
					len;

				if(isArray(spec)) {
					len = spec.length;
					if(len == 0) {
						promise.resolve(processed);
					}
					processed = result||[];

					var arrCount = len;
					for(var i=0; i<len; i++) {
						parse(spec[i]).then(
							createResolver(--arrCount, processed, i, promise),
							reject(promise));
					}

				} else if(typeof spec == 'object') {
					// module, reference, or simple object
					var moduleToLoad = getModule(spec);
					if(moduleToLoad) {
						objectsToCreate++;
						if(spec.init) objectsToInit++;
						// Create object from module
						loadModule(moduleToLoad).then(
							function handleModuleLoaded(module) {
								createObject(spec, module).then(
									function handleObjectCreated(created) {
										promise.resolve(created);
										if(++objectCreateCount === objectsToCreate) {
											objectsCreated.resolve(context);
										}
										initObject(spec, created).then(
											function handleObjectInited(object) {
												if(++objectInitCount === objectsToInit) {
													domReady.then(function() {
														objectsReady.resolve(context);
													});
												}
											});
									},
									reject(contextReady)
								);
							}
						);

					} else if(isRef(spec)) {
						// Resolve reference
						resolveRef(spec).then(
							function handleResolveRef(target) {
								promise[target === undef ? 'reject' : 'resolve'](target);
							},
							reject(promise)
						);

					} else {
						processed = result || {};
						var props = keys(spec);

						len = props.length;
						if(len == 0) {
							promise.resolve(processed);
						} else {
							var propCount = len;
							for(var j=0; j<len; j++) {
								var p = props[j];
								parse(spec[p]).then(
									createResolver(--propCount, processed, p, promise),
									reject(promise)
								);
							}
						}
					}

				} else {
					promise.resolve(processed);
				}

				return promise;
			}

			function destroy() {
				contextReady.then(
					function(context) {
						for(var i=0; i < destroyers.length; i++) {
							destroyers[i]();
						}

						fireEvent('onContextDestroy', context);
						contextDestroyed.resolve();
					},
					reject(contextDestroyed)
				);

				return contextDestroyed;
			}
			
			function wire(spec) {
				initPromiseStages();
				
				if(parent) {
					initFromParent(parent);
				}

				try {
					parse(spec, context).then(
						finalizeContext,
						reject(contextReady)
					);

					loadModules(keys(uniqueModuleNames), function handleModulesLoaded() {
						scanPlugins(arguments).then(function handlePluginsScanned(scanned) {
							modulesReady.resolve(scanned);
						});
					});

				} catch(e) {
					contextReady.reject(e);
				}

				return contextReady;
			}
			
			return {
				wire: wire
			};
		})(parent);
	}
	
	/*
		Function: wire
		Global wire function that is the starting point for wiring applications.
		
		Parameters:
			spec - wiring spec
			ready - Function to call with the newly wired Context
	*/
	var w = global['wire'] = function wire(spec) { // global['wire'] for closure compiler export
		var promise;
		if(rootContext === undef) {
			// No root context yet, so wire it first, then wire the requested spec as
			// a child.  Subsequent wire() calls will reuse the existing root context.
			promise = new Promise();
			
			contextFactory().wire(rootSpec).then(function(context) {
				rootContext = context;
				rootContext.wire(spec).then(
					function(context) {
						promise.resolve(context);
					},
					function(err) {
						promise.reject(err);
					}
				);
			});
		} else {
			promise = rootContext.wire(spec);
		}
		
		return safe(promise); // Return restricted promise
	};
	
	w.version = VERSION;
	
	// WARNING: Probably unsafe. Just for testing right now.
	// TODO: Only do this for browser env
	
	// Find our script tag and look for data attrs
	for(var i=0; i<scripts.length; i++) {
		var script = scripts[i],
			src = script.src,
			specUrl;
		
		// if(/wire[^\/]*\.js(\W|$)/.test(src) && (specUrl = script.getAttribute('data-wire-spec'))) {
		if((specUrl = script.getAttribute('data-wire-spec'))) {
			// Use a script tag to load the wiring spec
			var specScript = doc.createElement('script');
			specScript.src = specUrl;
			head.appendChild(specScript);
		}
	}

})(window);
