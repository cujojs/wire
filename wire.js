/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: wire.js
*/
//
// TODO:
// - Allow easier loading of modules that don't actually need to be references, like dijits that
//   might be used for data-dojo-type
// - Consider "deep" references via JSON path syntax, e.g. : "myObject.subObject.name".  There are
//   pros and cons to this, and it could be abused to create a lot of spaghetti in a wiring
//   spec.
// - Should functions be allowed in wiring specs?  e.g. specifying a function as module or create
//   and having that work as expected?
// - Explore the idea of different kinds of factories that know how to manage the lifecycle of
//   modules/objects of particular types, such as dijits, instead of plugins having to feature
//   test objects to know if they can handle them.
// - jQuery UI plugin(s) for creating widgets?
//
(function(global, undef){
	"use strict";

	var VERSION = "0.1",
		wirePrefix = 'wire$',
		tos = Object.prototype.toString,
		doc = global.document,
		head = doc.getElementsByTagName('head')[0],
		scripts = doc.getElementsByTagName('script'),
		// Hook up to require
		loadModules = global['require'], // appease closure compiler
		getLoadedModule = loadModules, // this may be requirejs specific
		onDomReady = loadModules.ready, // this is requirejs specific
		rootSpec = global.wire || {},
		defaultModules = ['wire/base'],
		rootContext;
		
	/*
		Section: Javascript Helpers
		Standard JS helpers
	*/
	
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
		Function: keys
		Creates an array of the supplied objects own property names
		
		Parameters:
			obj - Object
			
		Returns:
		Array of obj's own (via hasOwnProperty) property names.
	*/
	function keys(obj) {
		var k = [];
		for(var p in obj) {
			if(obj.hasOwnProperty(p)) {
				k.push(p);
			}
		}
		
		return k;
	}
	
	/*
		Section: wire Helpers
		wire-specific helper functions
	*/
	/*
		Function: getModule
		If spec is a module, gets the value of the module property (usually an AMD module id)
		
		Parameters:
			spec - any wiring spec
			
		Returns:
		the value of the module property, or undefined if the supplied spec
		is not a module.
	*/
	function getModule(spec) {
		return spec.create
			? (typeof spec.create == 'string' ? spec.create : spec.create.module)
			: spec.module;
	}
	
	/*
		Function: isRef
		Determines if the supplied spec is a reference
		
		Parameters:
			spec - any wiring spec
			
		Returns:
		true iff spec is a reference, false otherwise.
	*/
	function isRef(spec) {
		return spec && spec.$ref !== undef;
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
	};

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
		Function: createResolver
		Creates a function to used as a promise resolver, that will resolve another, supplied
		promise if remaining === 0.
		
		Parameters:
			remaining - if remaining === 0, the supplied promise will be resolved with object as the result
			object - object[prop] will be assigned the result of the outer promise, and will be passed
			         to the supplied promise as the resolution
			prop - object[prop] will be assigned the result of the outer promise
			promise - promise to be resolved with object if remaining === 0
			
		Returns:
		A resolution function for a promise
	*/
	function createResolver(remaining, object, prop, promise) {
		return function resolver(result) {
			object[prop] = result;
			if(remaining == 0) {
				promise.resolve(object);
			}
		};
	}
	
	/*
		Function: processFuncList
		Resolves list to 1 or more functions of target, and invokes callback
		for each function.
		
		Parameters:
			list - String function name, or array of string function names
			target - Object having the function or array of functions in list
			spec - wiring spec used to create target
			callback - function to be invoked for each function name in list
			
		Returns:
		a <Promise> that will be resolved after all the functions in list
		have been processed.
	*/
	function processFuncList(list, target, spec, callback) {
		var func,
			p = new Promise();
			
		if(typeof list == "string") {
			func = target[list];
			if(isFunction(func)) {
				callback(target, spec, func, []);
				p.resolve(target);
			} else {
				p.reject(target);
			}
			
		} else {
			var k = keys(list),
				count = k.length;
				
			for(var f in list) {
				func = target[f];
				if(isFunction(func)) {
					callback(target, spec, func, list[f]);
				}
			}
			
			p.resolve(target);
		}
		
		return p;
	}
	
	/*
		Class: Context
		A Context is the result of wiring a spec.  It will contain all the fully
		realized objects, plus its own wire(), resolve(), and destroy() functions.
	*/
	/*
		Constructor: Context
		Creates a new, empty Context ready for wiring.
	*/
	var Context = function() {};
	
	/*
		Class: ContextFactory
		A ContextFactory does the work of creating a <Context> and wiring its objects
		given a wiring spec.
	*/
	/*
		Constructor: ContextFactory
	*/
	function ContextFactory(parent) {
		return (function(parent) {
			// Use the prototype chain for context parent-child
			// relationships
			Context.prototype = parent ? parent.context : undef;
			var context = new Context(),
				// Track loaded modules to unique-ify them.  RequireJS currently breaks
				// when the same module is listed twice in the same dependency array
				// so this also helps to avoid that problem.
				uniqueModuleNames = {},
				// Top-level promises
				modulesReady = new Promise(),
				// objectsCreated = new Promise(),
				objectsReady = new Promise(),
				contextReady = new Promise(),
				contextDestroyed = new Promise(),
				domReady = new Promise(),
				objectDefs = {},
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
				/*
					Class: FactoryProxy
					A proxy of the ContextFactory that is given to plugins
				*/
				factoryProxy = {
					modulesReady: safe(modulesReady),
					objectsReady: safe(objectsReady),
					domReady: safe(domReady),
					resolveName: function(name) {
						return context[name];
					},
					resolveRef: function(ref) {
						return resolveRef(ref);
					},
					objectReady: function(name) {
						return safe(objectDefs[name]);
					}
				},
				// Track destroy functions to be called when context is destroyed
				destroyers = [],
				// Counters for objects to create and init so that promises
				// can be resolved when all are complete
				objectsToInit = 0,
				objectInitCount = 0;

			// Mixin default modules
			for(var i=0; i<defaultModules.length; i++) {
				uniqueModuleNames[defaultModules[i]] = 1;
			}
			
			/*
				Function: resolveRefObj
				Resolves the supplied reference, delegating to ancestor <Contexts> if
				necessary.
				
				Parameters:
					refObj - JSON Ref
					promise - <Promise> to resolve once the reference has been resolved,
							  or to reject if the reference cannot be resolved.
			*/
			function resolveRefObj(refObj, promise) {
				var ref = refObj.$ref,
					prefix = "$",
					name = ref;
					
				if(ref.indexOf("!") >= 0) {
					var parts = ref.split("!");
					prefix = parts[0];
				    name = parts[1];
				}
				
				if(prefix === "wire") {
					promise.resolve(context);
				} else {
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
						resolvers[prefix](factoryProxy, name, refObj, promiseProxy);

					} else {
						promiseProxy.unresolved();

					}
				}
			}

			/*
				Function: resolveRef
				Resolve the supplied reference.
				
				Parameters:
					ref - JSON Ref
					
				Returns:
				a <Promise> that will be resolved with the target of the reference once
				it has been resolved.
			*/
			function resolveRef(ref) {
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

			/*
				Function: contextProgress
				Shortcut for issueing progress updates
				
				Parameters:
					promise - <Promise> on which to issue the progress update
					status - String status of the target object
					target - Target object whose status has changed
					spec - wiring spec from which target object is being wired
			*/
			function contextProgress(promise, status, target, spec) {
				promise.progress({
					factory: factoryProxy,
					status: status,
					target: target,
					spec: spec
				});
			}

			/*
				Function: createObject
				Constructs an object from the supplied module using any create args in
				the supplied wiring spec for the object.
				
				Parameters:
					spec - wiring spec for the object to create
					module - loaded module to use to create the object.  This must be either
					         a constructor to be invoked with new, or a function that can
					         be called directly (without new) to create the object.
					
				Returns:
				a <Promise> that will be resolved when the object has been created, or
				rejected if the object cannot be created.
			*/
			function createObject(spec, module) {
				var p = new Promise(),
					object = module;

				function objectCreated(obj, promise) {
					modulesReady.then(function handleModulesReady() {
						contextProgress(contextReady, "create", object, spec);
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
			
			/*
				Function: initObject
				Sets properties and invokes initializer functions defined in spec
				on the supplied object.
				
				Parameters:
					spec - wiring spec with properties and init functions
					object - Object on which to set properties and invoke init functions
					
				Returns:
				a <Promise> that will be resolved once all properties have been set and
				init functions have been invoked.
			*/
			function initObject(spec, object) {
				var promise = new Promise();

				promise.then(function() {
					contextProgress(contextReady, "init", object, spec);
				});
				
				function resolveObjectInit() {
					contextProgress(contextReady, "props", object, spec);
					// Invoke initializer functions
					if(spec.init) {
						processFuncList(spec.init, object, spec,
							function handleProcessFuncList(target, spec, func, args) {
								callInit(target, spec, func, args);
							}
						).then(
							function() {
								promise.resolve(object);
							}
						);
					} else {
						promise.resolve(object);
					}
				}

				// Parse and set properties, and then invoke init functions
				if(spec.properties) {
					setProperties(object, spec.properties).then(
						resolveObjectInit,
						reject(promise)
					);
				} else {
					resolveObjectInit();
				}

				// Queue destroy functions to be called when this Context is destroyed
				// if(spec.destroy) {
					// TODO: Should we update progress for every object regardless of whether
					// it has a destroy func or not?
					destroyers.push(function doDestroy() {
						contextProgress(contextDestroyed, "destroy", object, spec);
						if(spec.destroy) {
							processFuncList(spec.destroy, object, spec, function(target, spec, func, args) {
								func.apply(target, []); // no args for destroy
							});
						}
					});
				// }

				return promise;
			}

			/*
				Function: setProperties
				Sets properties specified in props on object
				
				Parameters:
					object - Object on which to set properties
					props - property hash--may include wiring spec info, e.g. references, modules, etc.
					
				Returns:
				a <Promise> that will be resolved once all properties have been set
			*/
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
								promise.resolve(object);
							}
						}, reject(promise));
					})(name, props[name]);
				}

				return promise;
			}

			/*
				Function: callInit
				Applies func on target with supplied args.  Args must be parsed and fully
				realized and passed before applying func.
				
				Parameters:
					target - Object to which to apply func (i.e. target will be "this")
					spec - wiring spec that was used to create target, will be passed to listeners
					func - Function to be applied to target
					args - unrealized args to pass to func
					
				Returns:
				a <Promise> that will be resolved after func is actually invoked.
			*/
			function callInit(target, spec, func, args) {
				var p = new Promise();
				parse(args).then(function handleInitParsed(processedArgs) {
					func.apply(target, isArray(processedArgs) ? processedArgs : [processedArgs]);
					p.resolve(target);
				});
				
				return p;
			}

			/*
				Function: loadModule
				Loads the module with the supplied moduleId
				
				Parameters:
					moduleId - id of module to load
					
				Returns:
				a <Promise> that will be resolved when the module is loaded.  The value
				of the <Promise> will be the module.
			*/
			function loadModule(moduleId) {

				var p = uniqueModuleNames[moduleId];

				if(!p) {
					p = uniqueModuleNames[moduleId] = new Promise();
					loadModules([moduleId], function handleModulesLoaded(module) {
						p.resolve(module);
					});
				}

				return p;
			}

			/*
				Function: scanPlugins
				Scans the supplied Array of concrete modules and registers any plugins found
				
				Parameters:
					modules - Array of modules to scan
					
				Returns:
				a <Promise> that will be resolved once all modules have been scanned and their
				plugins registered.
			*/
			function scanPlugins(modules) {
				var p = new Promise(),
					ready = safe(contextReady),
					destroy = safe(contextDestroyed);

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

						// if(newPlugin.wire$listeners) {
						// 	addEventListeners(newPlugin.wire$listeners);
						// }

						if(isFunction(newPlugin.wire$init)) {
							// Have to init plugins immediately, so they can be used during wiring
							newPlugin.wire$init();
						}
						
						if(isFunction(newPlugin.wire$wire)) {
							newPlugin.wire$wire(ready, destroy);
						}
					}
				}

				p.resolve(modules);
				return p;
			}

			/*
				Function: initPromiseStages
				Initializes the lifecycle related promises for modulesReady, contextReady,
				and domReady.
			*/
			function initPromiseStages() {
				onDomReady(function resolveDomReady() {
					domReady.resolve();
				});

				modulesReady.then(null,
					function rejectModulesReady(err) {
						contextReady.reject(err);
					}
				);
			}

			/*
				Function: initFromParent
				Initializes this <Context> from a parent <Context>.
				
				Parameters:
					parent - parent <Context>
			*/
			function initFromParent(parent) {
				parent.beforeDestroy(function handleParentDestroyed() { destroy(); });
			}

			/*
				Function: parseArray
				Parses and fully realizes all elements of the supplied array
				
				Parameters:
					spec - wiring spec describing an Array
					
				Returns:
				a <Promise> that will be resolved when all elements of the Array
				have been realized.
			*/
			function parseArray(spec) {
				var processed = [],
					promise = new Promise(),
					len = spec.length;
					
				if(len == 0) {
					promise.resolve(processed);
				} else {
					var arrCount = len;
					for(var i=0; i<len; i++) {
						parse(spec[i]).then(
							createResolver(--arrCount, processed, i, promise),
							reject(promise)
						);
					}
				}

				return promise;
			}

			/*
				Function: parseModule
				Parses, contructs, sets properties on, and initializes the supplied
				module wiring spec, using the module whose id is moduleToLoad.
				
				Parameters:
					spec - wiring spec describing a module
					moduleToLoad - id of module to use
					
				Returns:
				a <Promise> that will be resolved when the module has been fully
				realized.
			*/
			function parseModule(spec, moduleToLoad) {
				var promise = new Promise();
				
				objectsToInit++;
				
				promise.then(function(object) {
					if(++objectInitCount === objectsToInit) {
						// FIXME: This domReady should not be necessary but is currently.
						domReady.then(function() {
							objectsReady.resolve(context);
						});
					}
				});
				
				// Create object from module
				
				// FIXME: This is a nasty mess right here, kids.  This needs to be
				// factored to reduce the nesting and make it clearer what is happening.
				// It may be possible to move object creation and initialization out
				// to "factory" plugins that know how to handle certain types of
				// objects
				loadModule(moduleToLoad).then(
					function handleModuleLoaded(module) {
						
						createObject(spec, module).then(
							function handleObjectCreated(created) {
						
								initObject(spec, created).then(
									function handleObjectInited(object) {
						
										promise.resolve(created);
										
									},
									reject(contextReady)
								);
							},
							reject(contextReady)
						);
					}
				);
				
				return promise;
			}
			
			/*
				Function: parseObject
				Parses and fully realizes the supplied object wiring spec.
				
				Parameters:
					spec - a wiring spec describing an object
					container - If present, the spec will be realized into the container Object.
						That is, container will become the fully realized Object.
			*/
			function parseObject(spec, container) {
				var processed = container || {},
					promise = new Promise(),
					props = keys(spec),
					len = props.length;
					
				if(len == 0) {
					promise.resolve(processed);
				} else {
					var propCount = len;
					for(var j=0; j<len; j++) {
						var p = props[j],
							objectPromise = parse(spec[p]);
							
						if(container && p !== undef && !objectDefs[p]) {
							objectDefs[p] = objectPromise;
						}

						objectPromise.then(
							createResolver(--propCount, processed, p, promise),
							reject(promise)
						);
					}
				}
				
				return promise;
			}
			
			/*
				Function: parse
				Parse and fully realize the supplied wiring spec.  If container is supplied,
				the resulting objects will be placed into it.
				
				Parameters:
					spec - wiring spec describing an Array, module, Object, or plain value
						(String, Number, etc.)
					container - Object into which to place created objects
					
				Returns:
				a <Promise> that will be resolved once all objects in spec have been fully
				realized (created, properties set, initialized, plugins invoked, etc.)
			*/
			function parse(spec, container) {
				var promise;

				if(isArray(spec)) {
					// Array
					promise = parseArray(spec);

				} else if(typeof spec == 'object') {
					// module, reference, or simple object

					var moduleToLoad = getModule(spec);
					
					if(moduleToLoad) {
						// Module
						promise = parseModule(spec, moduleToLoad);
					
					} else if(isRef(spec)) {
						// Reference
						promise = resolveRef(spec);
					
					} else {
						// Simple object
						promise = parseObject(spec, container);
					}

				} else {
					// Integral value/basic type, e.g. String, Number, Boolean, Date, etc.
					promise = new Promise();
					promise.resolve(spec);
				}

				return promise;
			}

			/*
				Function: wire
				Wires the supplied spec, fully realizing all objects.
				
				Parameters:
					spec - wiring spec
					
				Returns:
				a <Promise> that will be resolved with the fully realized <Context> once
				wiring is complete, or rejected if the supplied spec cannot be wired.
			*/
			function wire(spec) {
				initPromiseStages();
				
				if(parent) {
					initFromParent(parent);
				}

				try {
					parseObject(spec, context).then(
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
			
			/*
				Function: destroy
				Destroys this <Context> by invoking all registered destroy functions, and all
				onContextDestroy listeners.
				
				Returns:
				a <Promise> that will be resolved when the <Context> has been fully destroyed.
			*/
			function destroy() {
				function doDestroy() {
					// Invoke all registered destroy functions
					for (var i=0; i < destroyers.length; i++) {
						try {
							destroyers[i]();
						} catch(e) {
							/* squelch? */
							console.log(e);
						}
					}
					
					// Clear out the context
					for(var p in context) {
						delete context[p];
					}

					// Resolve promise
					contextDestroyed.resolve();
				}
				
				contextReady.then(doDestroy, doDestroy);

				return contextDestroyed;
			}

			/*
				Function: finalizeContext
				Adds public functions to the supplied context and uses it to resolve the
				contextReady promise.
				
				Parameters:
					parsedContext - <Context> to finalize and use as resolution for contextReady
			*/
			function finalizeContext(parsedContext) {
				/*
					Class: Context
				*/
				/*
					Function: wire
					Wires a new child <Context> from this <Context>
					
					Parameters:
						spec - wiring spec
						
					Returns:
					a <Promise> that will be resolved when the new child <Context> has
					been wired.
				*/
				parsedContext.wire = function wire(spec) {
					var newParent = {
						wire: wire,
						context: context,
						resolveRefObj: resolveRefObj,
						beforeDestroy: function beforeDestroy(func) {
							// Child contexts must be destroyed before parents
							destroyers.unshift(func);
						}
					};
					return safe(ContextFactory(newParent).wire(spec));
				};

				/*
					Function: resolve
					Resolves references using this <Context>.  This will cascade up to ancestor <Contexts>
					until the reference is either resolved or the root <Context> has been reached without
					resolution, at which point the returned <Promise> will be rejected.
					
					Parameters:
						ref - reference name (String) to resolve
						
					Returns:
					a <Promise> that will be resolved when the reference has been resolved or rejected
					if the reference cannot be resolved.
				*/
				parsedContext.resolve = function resolve(ref) {
					return safe(resolveRef({ $ref: ref }));
				};
				
				/*
					Function: destroy
					Destroys all this <Context>'s children, and then destroys this <Context>.  That is,
					<Context> hierarchies are destroyed depth-first _postordering_, i.e. "bottom-up".
					
					Returns:
					a <Promise> that will be resolved when this <Context> has been destroyed.
				*/
				parsedContext.destroy = function destroyContext() {
					return safe(destroy());
				};

				if(objectsToInit === 0 && !objectsReady.completed) {
					objectsReady.resolve(parsedContext);
				}

				objectsReady.then(function finalizeContextReady(readyContext) {
					// TODO: Remove explicit domReady wait
					// It should be possible not to have to wait for domReady
					// here, but rely on promise resolution.  For now, just wait
					// for it.
					domReady.then(function() {
						contextReady.resolve(readyContext);
					});
				});
			}

			return {
				wire: wire
			};
		})(parent);

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
			// capture calls to then()
			this._thens.push({ resolve: onResolve, reject: onReject, progress: onProgress });
			onProgress && this._progress.push(onProgress);
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
			this.then = which === 'reject' ?
				function (resolve, reject) { reject && reject(arg); } :
                    function (resolve) { resolve && resolve(arg); };
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
	
	/*
		Section: wire API
		The global wire function is the entry point to wiring.
	*/
	/*
		Function: wire
		Global wire function that is the starting point for wiring applications.
		
		Parameters:
			spec - wiring spec
			
		Returns:
		a <Promise> that will be resolved when the <Context> has been wired.  The
		newly wired <Context> will be the value of the <Promise>
	*/
	var w = global['wire'] = function wire(spec) { // global['wire'] for closure compiler export
		
		var promise;
		
		// If the root context exists, simply use it to wire the new context.
		// If it doesn't exist, wire the root context first, then use it
		// to wire the new child.
		if(rootContext) {
			// Context.wire returns a safe promise
			promise = rootContext.wire(spec);

		} else {
			// No root context yet, so wire it first, then wire the requested spec as
			// a child.  Subsequent wire() calls will reuse the existing root context.
			var unsafePromise = new Promise();
			
			ContextFactory().wire(rootSpec).then(function(context) {
				rootContext = context;
				rootContext.wire(spec).then(
					function(context) {
						unsafePromise.resolve(context);
					},
					function(err) {
						unsafePromise.reject(err);
					}
				);
			});
			
			// Make sure we return a safe promise
			promise = safe(unsafePromise);

		}
		
		return promise;
	};
	
	// Add version
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
			// Use loader to load the wiring spec
			loadModules([specUrl]);
			// // Use a script tag to load the wiring spec
			// var specScript = doc.createElement('script');
			// specScript.src = specUrl;
			// head.appendChild(specScript);
		}
	}

})(window);
