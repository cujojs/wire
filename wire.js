/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

//
// TODO:
// - Allow easier loading of modules that don't actually need to be references, like dijits that
//    might be used for data-dojo-type
// - It's easy to forget the "create" property which triggers calling a module as a constructor.  Need better syntax, or
//    maybe create should be the default?
// - "destroy" property similar to init, that specifies what function to call on an object when its context is
//    destroyed.
//
(function(global, undef){
	"use strict";

	var VERSION = "0.1",
		tos = Object.prototype.toString,
		arrt = '[object Array]',
		doc = document,
		head = doc.getElementsByTagName('head')[0],
		scripts = doc.getElementsByTagName('script'),
		loadModules = window['require'],
		getLoadedModule = loadModules,
		rootSpec = global.wire || {};
		
	function isArray(it) {
		return tos.call(it) === arrt;
	}

	function mixin(dst, src) {
		for(var p in src) {
			dst[p] = src[p];
		}

		return dst;
	}
	
	function isModule(spec) {
		return spec.module;
	}
	
	function isRef(spec) {
		return spec && spec.$ref !== undef;
	}
	
	var Promise = function() {
		this.completed = 0;
		this.chain = [];
	};
	
	Promise.prototype = {
		
		promise: function() {
			var self = this;
			return {
				then: function(resolved, rejected) {
					self.then(resolved, rejected);
				}
			};
		},
		
		then: function(resolved, rejected) {
			var p = new Promise(),
				completed = this.completed,
				result = this.result;
				
			if(completed < 0) {
				p.then(resolved, rejected);
				// return reject(rejected);
				p.reject(result);
			} else if(completed > 0) {
				p.then(resolved, rejected);
				// return resolve(resolved);
				p.resolve(result);
			} else {
				this.chain.push({ resolve: resolved, reject: rejected, promisor: p });
			}

			return p;
		},
		
		resolve: function(value) {
			return this.complete('resolve', value, 1);
		},
		
		reject: function(value) {
			return this.complete('reject', value, -1);
		},
		
		complete: function(action, value, completeType) {
			if(this.completed) throw Error("Promise already completed");
			
			this.completed = completeType;
			var res = this.result = value,
				chain = this.chain;
		
			for(var i=0; i<chain.length; i++) {
				try {
					var c = chain[i],
						newResult = c[action](res);
					if(newResult !== undef) {
						if(typeof newResult.then == 'function') {
							newResult.then(c.promisor.resolve, c.promisor.reject);
						} else if(newResult instanceof Error) {
							action = 'reject';
							this.completed = -1;
							res = newResult;
						} else {
							res = newResult;
						}
					}
				} catch(e) {
					res = e;
					action = 'reject';
				}
			}
			
			return this.result;
		}
		
	};

	var ContextFactory = function(parent) {
		this.parent = parent;
		this.moduleIds = [];
		this.uniqueModuleNames = {};
		this.modulesReady = new Promise();
		this.objectsCreated = new Promise();
		this.setters = [];
		this.resolvers = {};
		this.listeners = {};
		this.objectsToCreate = 0;
		
		this.context = {};
	};
	
	ContextFactory.prototype = {
		
		resolveName: function(name) {
			var resolved = this.context[name];
			if(resolved == undef && this.parent) {
				resolved = this.parent.resolveName(name);
			}
			
			return resolved;
		},

		resolveRef: function(ref) {
			var p = new Promise(),
				self = this;
			if(!isRef(ref)) {
				p.resolve(ref);
			} else {
				this.objectsCreated.then(function() {
					var resolved = self.resolveName(ref.$ref);
					if(resolved !== undef) {
						p.resolve(resolved);
					} else {
						p.reject({ ref: ref, message: "Ref " + ref.$ref + " could not be resolved" });
					}
				}, this.reject);
			}
			return p;
		},

		createObject: function(spec, module) {
			var p = new Promise(),
				object = module,
				self = this;

			function resolveObject(obj, promise) {
				self.modulesReady.then(function() {
					promise.resolve(obj);
				}, self.reject);
			}

			if(typeof module == 'function') {
				var args = isArray(spec.create) ? spec.create : [spec.create];
				this.parse(args).then(function(resolvedArgs) {
					resolveObject(instantiate(module, resolvedArgs), p);
				}, this.reject);
			} else {
				resolveObject(object, p);
			}
			
			
			return p;
		},
		
		initObject: function(spec, object) {
			var promisor = new Promise(),
				self = this;
			
			if(spec.properties) {
				var props = spec.properties,
					propsArr = [];
				for(var p in props) {
					propsArr.push(p);
				}
				
				var count = propsArr.length;
				for(var i=0; i<propsArr.length; i++) {
					(function() {
						var p = propsArr[i];
						self.resolveRef(props[p]).then(function(resolved) {
							object[p] = resolved;
							if(--count == 0) {
								promisor.resolved(object);
							}
						}, self.reject);
						
					})();
				}
			}
			
			return promisor;
		},

		loadModule: function(moduleId) {
			var p = new Promise();

			if(!this.uniqueModuleNames[moduleId]) {
				this.uniqueModuleNames[moduleId] = 1;
				this.moduleIds.push(moduleId);
			}

			this.modulesReady.then(function() {
				p.resolve(getLoadedModule(moduleId));
			}, this.reject);

			return p;
		},
		
		reject: function(err) {
			console.log("ERROR", err);
			throw err;
		},

		wire: function(spec) {
			var contextReady = new Promise(),
				modulesReady = this.modulesReady,
				moduleIds = this.moduleIds,
				self = this;

			try {
				this.parse(spec, this.context).then(function(context) {
					// self.context = context;
					context.wire = function wire(spec) {
						return new ContextFactory(self).wire(spec);
					};
					
					context.resolve = function resolve(ref) {
						return self.resolveName(ref);
					};
					
					contextReady.resolve(context);
				}, this.reject);

				loadModules(moduleIds, function() {
					modulesReady.resolve(arguments);
				}, this.reject);

			} catch(e) {
				contextReady.reject(e);
			}

			return contextReady.promise();
		},

		parse: function(spec, result) {

			var processed = spec,
				promisor = new Promise(),
				self = this,
				count,
				len;

			if(isArray(spec)) {
				len = spec.length;
				if(len == 0) {
					promisor.resolve(processed);
				}
				// console.log("Array", spec);
				processed = result||[];

				var arrCount = len;
				for(var i=0; i<len; i++) {
					var resolveArray = (function() {
						var index = i; // Capture array index
						return function arrayResolver(result) {
							processed[index] = result;
							if(--arrCount == 0) {
								promisor.resolve(processed);
							}
						};
					})();
					this.parse(spec[i]).then(resolveArray, this.reject);
				}


			} else if(typeof spec == 'object') {
				// module, reference, or simple object
				if(isModule(spec)) {
					// console.log("Module", spec);
					// Create object from module
					self.objectsToCreate++;
					this.loadModule(spec.module).then(function(module) {
						self.createObject(spec, module).then(function(created) {
							promisor.resolve(created);
							
							self.objectsCreated.then(function() {
								return self.initObject(spec, created);
							});
							
							if(--self.objectsToCreate === 0) {
								self.objectsCreated.resolve();
							}
							
						});
					}, this.reject);
					

				} else if(isRef(spec)) {
					// console.log("Ref", spec);
					// Resolve reference
					this.resolveRef(spec).then(
						function(target) {
							promisor[target === undef ? 'reject' : 'resolve'](target);
						},
						this.reject
					);

				} else {
					// console.log("POJO", spec);

					// Recurse on plain object properties
					processed = result||{};
					var props = [];
					for(var prop in spec) {
						props.push(prop);
					}
					len = props.length;
					if(len == 0) {
						promisor.resolve(processed);
						// console.log("empty", spec);
					} else {
						// console.log("resolving POJO", len, spec);
						var propCount = len;
						for(var j=0; j<len; j++) {
							var resolveObject = (function() {
								var index = j; // Capture property index
								return function objectResolver(result) {
									// console.log("INNER resolving prop " + props[index], index, result, spec);
									processed[props[index]] = result;
									if(--propCount == 0) {
										promisor.resolve(processed);
									}
								};
							})();

							// console.log("OUTER resolving prop", props[j], spec[props[j]], spec);
							this.parse(spec[props[j]]).then(resolveObject, this.reject);
						}
					}
				}
			} else {
				// console.log("Something else", spec);
				promisor.resolve(processed);
			}

			return promisor;
		}		
	};

	var F = function F(ctor, args) {
			return ctor.apply(this, args);
		};

	function instantiate(ctor, args) {
		F.prototype = ctor.prototype;
		F.prototype.constructor = ctor;
		return new F(ctor, args);
	}
	
	/*
		Function: createContext
		Creates a new Context with the supplied base Context.
		
		Parameters:
			spec - wiring spec
			modules - AMD module names loaded in this Context
			base - base (parent) Context.  Objects in the base are available
				to this Context.
	*/
	function createContext(spec, moduleNames, modules, base) {
		
		return (function doWire() {
			// TODO: There just has to be a better way to do this and keep
			// the objects hash private.
			var wirePrefix = 'wire$',
				plugins = {
					onContextInit: [],
					onContextError: [],
					onContextReady: [],
					onContextDestroy: [],
					onCreate: [],
					onProperties: [],
					onInit: [],
					onDestroy: []
				},
				objectInitQueue = [],
				objectDestroyQueue = [],
				refCache = {},
				context;
				
			function error(msg, data) {
				fireEvent("onContextError", context, msg, data);
				throw Error(msg);
			}

			/*
				Function: registerPlugins
				Inspects all modules for plugins and registers any it finds

				Parameters:
					modules - Array of loaded modules

				Returns:
					Registered plugins
			*/
			function registerPlugins(modules) {
				var resolvers = {},
					setters = [];

				for (var i=0; i < modules.length; i++) {
					var newPlugin = modules[i];
					// console.log("scanning for plugins: " + newPlugin);
					if(newPlugin.wire$resolvers) {
						for(var name in newPlugin.wire$resolvers) {
							// console.log("resolver plugin: " + name);
							resolvers[name] = newPlugin.wire$resolvers[name];
						}
					}

					if(newPlugin.wire$setters) {
						setters = setters.concat(newPlugin.wire$setters);
					}

					addEventListener(newPlugin);

					if(typeof newPlugin.wire$init == 'function') {
						// Have to init plugins immediately, so they can be used during wiring
						newPlugin.wire$init();
					}
				}

				plugins.setters = setters;
				plugins.resolvers = resolvers;
			}
			
			function addEventListener(listener) {
				for(var p in plugins) {
					if(typeof listener[wirePrefix + p] == 'function') {
						plugins[p].push(listener);
					}
				}
			}
			
			/*
				Function: fireEvent
				Invokes the set of plugins registered under the name (first param), e.g. "onContextInit", and
				passes all subsequent parameters as parameters to each plugin in the set.  This not only
				invokes plugins registered with this context, but with all ancestor contexts as well.
				
				Parameters:
					name - First argument is the name of the plugin type to call, e.g. "onContextInit"
					args - Arguments to be passed to plugins
			*/
			function fireEvent(/* name, arg1, arg2... */) {
				var args = Array.prototype.slice.call(arguments),
					name = args.shift(),
					pluginsToCall = plugins[name];

				for(var i=0; i<pluginsToCall.length; i++) {
					var plugin = pluginsToCall[i];
					plugin[wirePrefix + name].apply(plugin, args);
				}
			}

			/*
				Function: setProperties
				Sets the supplied properties on the supplied target object.  This function attempts to
				use registered setter plugins, but if none succeed, falls back to standard Javascript
				property setting, e.g. target[prop] = value.
				
				Parameters:
					target - Object on which to set properties
					properties - Hash of properties to set, may contain references, wiring specs, etc.
				
			*/
			function setProperties(target, properties) {
				var setters = plugins.setters,
					cachedSetter;
				for(var p in properties) {
					if(p !== '_') { // Prevent cached instances from being set as properties
						var success = false,
							value = resolveObject(properties[p]);

						if(cachedSetter) {
							// If we previously found a working setter for this target, use it
							success = cachedSetter(target, p, value);
						}

						// If no cachedSetter, or cachedSetter failed, try all setters
						if(!success) {
							// Try all the registered setters until we find one that reports success
							for(var i = 0; i < setters.length && !success; i++) {
								success = setters[i](target, p, value);
								if(success) {
									cachedSetter = setters[i];
									break;
								}
							}
						}

						// If we still haven't succeeded, fall back to plain property value
						if(!success) {
							cachedSetter = function(target, prop, value) {
								target[prop] = value;
							};
							cachedSetter(target, p, value);
						}
					}
				}
			}

			function processFuncList(list, target, spec, callback) {
				var func;
				if(typeof list == "string") {
					// console.log("calling " + list + "()");
					func = target[list];
					if(typeof func == "function") {
						callback(target, spec, func, []);
					}
				} else {
					for(var f in list) {
						// console.log("calling " + f + "(" + list[f] + ")");
						func = target[f];
						if(typeof func == "function") {
							callback(target, spec, func, list[f]);
						}
					}
				}
			}

			function callInit(target, spec, func, args) {
				// Resolve all the args
				var resolvedArgs = [];
				if(isArray(args)) {
					for(var i=0; i<args.length; i++) {
						resolvedArgs.push(resolveObject(args[i]));
					}
				} else {
					resolvedArgs[0] = resolveObject(args);
				}
				
				func.apply(target, resolvedArgs);

				fireEvent('onInit', target, spec, resolveName);
			}

			function addReadyInit(target, spec, func, args) {
				require.ready(function() {
					callInit(target, spec, func, args);
				});
			}

			/*
				Function: constructContext
				Fully constructs and initializes all objects, and resolves all references in the supplied
				wiring spec.
				
				Parameters:
					spec - wiring spec
			*/
			function constructContext(spec) {
				createObjects(spec);

				for(var i=0; i<objectInitQueue.length; i++) {
					objectInitQueue[i]();
				}
				
				var context;
				if(base) {
					// EXPERIMENTAL: Make ancestor context objects available as direct properties
					context = mixin({}, base.context);
					base.addEventListener({ wire$onContextDestroy: function() { context.destroy(); } });
				} else {
					context = {};
				}
				
				context.wire = function wire(spec, ready) {
					wireContext(spec, ready,
						{
							context: context,
							resolveName: resolveName,
							addEventListener: addEventListener
						});
				};
				context.destroy = function destroy() {
					for(var j=0; j<objectDestroyQueue.length; j++) {
						objectDestroyQueue[j]();
					}
					fireEvent("onContextDestroy", context);
				};
				context.resolve = resolveName;
				
				// EXPERIMENTAL: Make this context's objects available as direct properties
				// Add current context objects, overriding base objects with the same names
				return mixin(context, spec._);
			}
			
			/*
				Function: createObjects
				Recursively instantiate and cache objects, and resolve references (if they can
				be resolved at this point) in the wiring spec, and queue tasks to set properties
				and invoke initializer functions after all objects have been instantiated.
				
				Parameters:
					spec - wiring spec
					name - current scope name
					
				Returns:
					Object created for spec
			*/
			function createObjects(spec, name) {
				// By default, just return the spec if it's not an object or array
				var result = spec;

				// If spec is an object or array, process it
				if(isArray(spec)) {
					// If it's an array, createObjects() each element
					result = [];
					for (var i=0; i < spec.length; i++) {
						result.push(createObjects(spec[i]));
					}
					spec._ = result;

				} else if(typeof spec == 'object') {
					// If it's a module
					//  - if it has a create function, call it, with args and set result
					//  - if no factory function, invoke new as constructor and set result
					//  - if init function, invoke after factory or constructor
					// If it's a reference
					//  - resolve the reference directly, no recursive construction
					// If it's not a module
					//  - recursive createObjects() and set result
					if(isModule(spec)) {
						name = name || spec.name;
						result = getLoadedModule(spec.module);
						if(!result) {
							error("No module loaded with name", name);
						}
						
						if(spec.create) {
							// TODO: Handle calling a factory method and using the return value as result?
							// See constructWithFactory()
							// console.log('constructing ' + name + " from " + spec.module);
							result = constructWithNew(spec, result);
						}
						
						// Cache the actual object
						spec._ = result;
						
						if(spec.destroy) {
							objectDestroyQueue.push(function() {
								destroyObject(result, spec);
							});
						}
						
					} else if (isRef(spec)) {
						result = resolveNameDuringWire(spec.$ref);
						
					} else {
						// Recursively create sub-objects
						result = {};
						for(var prop in spec) {
							result[prop] = createObjects(spec[prop], prop);
						}
						spec._ = result;
					}

					// EXPERIMENTAL: Creating sub-objects on a reference.
					// Useful in some cases, such as a dijit reference, but useless/dangerous
					// in the case of a plain object!
					if(spec.properties) createObjects(spec.properties);
					if(spec.init) createObjects(spec.init);

					if(!isRef(spec)) fireEvent('onCreate', result, spec, resolveName);

					// Queue a function to initialize the object later, after all
					// objects have been created
					objectInitQueue.push(function() {
						initObject(spec);
					});
				}

				return result;
			}
			
			function initObject(spec) {
				var result = spec;
				
				if(spec._) {
					result = initTargetObject(spec._, spec);

				} else if (isRef(spec)) {
					// EXPERIMENTAL: Setting properties and calling initializers on a reference.
					// Useful in some cases, such as dijits, but dangerous for plain objects!
					result = initTargetObject(resolveNameDuringWire(spec.$ref), spec);
					
				} else {
					result = {};
					for(var prop in spec) {
						result[prop] = resolveObject(spec[prop]);
					}
					
				}
				
				return result;
			}
			
			function initTargetObject(target, spec) {
				if(spec.properties && typeof spec.properties == 'object') {
					setProperties(target, spec.properties);
					fireEvent('onProperties', target, spec, resolveName);
				}

				// If it has init functions, call it
				if(spec.init) {
					processFuncList(spec.init, target, spec, addReadyInit);
				}
				
				return target;
			}
			
			function destroyObject(target, spec) {
				var destroy = spec.destroy;
				processFuncList(spec.destroy, target, spec, function(target, spec, func, args) {
					func.apply(target, []); // no args for destroy
				});
			}
			
			/*
				Function: resolveObject
				Resolves the supplied object, which is either a reference object (e.g. { '$ref': 'name' })
				or an already-created spec object, to a concrete object.
				
				Parameters:
					refObj - either a reference object (e.g. { '$ref': 'name' }) or an
						already-created spec object.
						
				Returns:
					Concrete object.
			*/
			function resolveObject(refObj) {
				return isRef(refObj) ? resolveNameDuringWire(refObj.$ref, refObj) : getObject(refObj);
			}
			
			/*
				Function: resolveName
				Resolves the supplied ref name to a concrete object in this context, or any
				ancestor contexts, using registered resolvers if necessary.
				
				Parameters:
					ref - String name of the reference, including any leading plugin name
					refObj - (optional) Actual ref object (e.g. { '$ref': 'name' }) which
						specified the ref name to resolve.  This will be passed to resolver
						plugins to allow them to do extra processing on the reference if
						they want
						
				Returns:
					Concrete object to which ref refers.
			*/
			function resolveName(ref, refObj) {
				var resolved,
					resolvers = plugins.resolvers;
				if(ref in refCache) {
					resolved = refCache[ref];
					
				} else {
					if(ref.indexOf("!") == -1) {
						resolved = (ref in spec) ? getObject(spec[ref]) : undef;

					} else {
						var parts = ref.split("!");

						if(parts.length == 2) {
							var prefix = parts[0];

							if(prefix in resolvers) {
								var name = parts[1];
								resolved = resolvers[prefix](name, refObj, context);
							}
						}

					}

					// Still unresolved, ask base context to try to resolve
					if(resolved === undef) {
						resolved = (base && base.resolveName(ref)) || undef;
					}
					
				}
				
				if(resolved !== undef) {
					// Resolved, cache the resolved reference
					refCache[ref] = resolved;
					// Return the actual object
					return getObject(resolved);
				}
				
				return undef;
			}
			
			function resolveNameDuringWire(ref, refObj) {
				var resolved = resolveName(ref, refObj);
				
				if(resolved === undef) {
					// Still unresolved
					error("Reference " + ref + " cannot be resolved", name);
				} else if(isRef(resolved)) {
					// Check for recursive 
					error("Recursive $refs not allowed: " + ref + " refers to $ref " + resolved.$ref, { name: ref, resolved: resolved });
				}
				 
				return resolved;
			}

			function getObject(spec) {
				return (spec && spec._) ? spec._ : spec;
			}
			
			if(modules.length > 0) registerPlugins(modules);

			fireEvent("onContextInit", modules, moduleNames);

			context = constructContext(spec, base);

			fireEvent("onContextReady", context);

			// TODO: Should the context should be frozen?
			// var freeze = Object.freeze || function(){};
			// freeze(context);

			return context;
		})();
	}


	// WARNING: Probably unsafe. Just for testing right now.
	// TODO: Only do this for browser env
	
	// Find our script tag and look for data attrs
	for(var i=0; i<scripts.length; i++) {
		var script = scripts[i],
			src = script.src,
			specUrl;
		
		if(/wire\S*\.js(\W|$)/.test(src) && (specUrl = script.getAttribute('data-wire-spec'))) {
			// Use a script tag to load the wiring spec
			var specScript = doc.createElement('script');
			specScript.src = specUrl;
			head.appendChild(specScript);
		}
	}

	/*
		Function: wire
		Global wire function that is the starting point for wiring applications.
		
		Parameters:
			spec - wiring spec
			ready - Function to call with the newly wired Context
	*/
	var w = global['wire'] = function wire(spec) { // global['wire'] for closure compiler export
		// if(rootContext === undef) {
		// 	var promisor = newPromisor();
		// 	wireContext(rootSpec).then(function(context) {
		// 		console.log("rootContext", context);
		// 		rootContext = context;
		// 		// rootContext.wire(spec).then(ready);
		// 		wireContext(spec).then(function(child) {
		// 			console.log("child", child);
		// 			promisor.resolve(child);
		// 		});
		// 	});
		// 	return promisor.promise();
		// } else {
		if(rootSpec) {
			var p = new Promise();
			
			new ContextFactory().wire(rootSpec).then(function(rootContext) {
				rootContext.wire(spec).then(
					function(context) {
						p.resolve(context);
					},
					function(err) {
						p.reject(err);
					}
				);
			});
			
			return p;
		}
		return new ContextFactory().wire(spec);
		// }
	};
	
	w.version = VERSION;

})(window);
