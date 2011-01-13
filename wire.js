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
		wirePrefix = 'wire$',
		tos = Object.prototype.toString,
		arrt = '[object Array]',
		doc = document,
		head = doc.getElementsByTagName('head')[0],
		scripts = doc.getElementsByTagName('script'),
		// Hook up to require
		loadModules = window['require'],
		getLoadedModule = loadModules, // this may be requirejs specific
		onDomReady = loadModules.ready, // this is requirejs specific
		rootSpec = global.wire || {},
		rootContext;
		
	function isArray(it) {
		return tos.call(it) === arrt;
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
		
		then: function(resolved, rejected, progress) {
			var p = new Promise(),
				completed = this.completed,
				result = this.result;
				
			if(completed < 0) {
				p.then(resolved, rejected);
				p.reject(result);

			} else if(completed > 0) {
				p.then(resolved, rejected);
				p.resolve(result);

			} else {
				this.chain.push({ resolve: resolved, reject: rejected, progress: progress, promisor: p });

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
	
	function reject(promise) {
		return function(err) {
			promise.reject(err);
		};
	}

	var ContextFactory = function(parent) {
		this.parent = parent;
		this.moduleIds = [];
		this.uniqueModuleNames = {};
		this.modulesReady = new Promise();
		this.objectsCreated = new Promise();
		this.contextReady = new Promise();
		this.contextDestroyed = new Promise();
		this.domReady = new Promise();

		this.context = {};
		
		this.setters = [];
		this.resolvers = {};
		this.listeners = {
			onContextInit: [],
			onContextError: [],
			onContextReady: [],
			onContextDestroy: [],
			onCreate: [],
			onProperties: [],
			onInit: [],
			onDestroy: []
		};
		this.destroyers = [];
		this.objectsToCreate = 0;
		
	};
	
	ContextFactory.prototype = {
		
		resolveName: function(name) {
			return this.context[name];
		},
		
		resolveRefObj: function(refObj) {
			var ref = refObj.$ref,
				parent = this.parent,
				resolved;
			
			if(ref.indexOf("!") == -1) {
				return this.resolveName(refObj.$ref);
			} else {
				var parts = ref.split("!"),
					resolvers = this.resolvers;

				if(parts.length == 2) {
					var prefix = parts[0];

					if(prefix in resolvers) {
						var name = parts[1];
						resolved = resolvers[prefix](name, refObj, this.context);
					}
				}
			}

			// Still unresolved, ask base context to try to resolve
			if(resolved === undef && parent) {
				resolved = parent.resolveRefObj(refObj);
			}

			return resolved;
		},

		resolveRef: function(ref) {
			// console.log("Trying to resolve", ref);
			var p = new Promise(),
				self = this;
			if(!isRef(ref)) {
				// console.log("Not a json ref, resolving to supplied value", ref);
				p.resolve(ref);
			} else {
				// Try to resolve immediately.  If that fails, defer resolution until
				// objects have been instantiated
				// console.log("Trying to resolve immediately", ref);
				var resolved = this.resolveRefObj(ref);
				if(resolved !== undef) {
					// console.log("Resolved " + ref.$ref + " immediately, deferring", resolved);
					p.resolve(resolved);
				} else {
					// console.log("Could not resolve " + ref.$ref + " immediately, deferring");
					// console.log("deferring ref resolution until objectsCreated", ref);
					this.objectsCreated.then(
						function() {
							// console.log("objectsCreated resolveRef", ref);
							var resolved = self.resolveRefObj(ref);
							if(resolved === undef) {
								// console.log("deferring ref resolution until domReady", ref);
								self.domReady.then(
									function() {
										// console.log("Resolving ref on domReady", ref);
										var resolved = self.resolveRefObj(ref);
										if(resolved === undef) {
											p.reject({ ref: ref, message: "Ref " + ref.$ref + " could not be resolved" });
										} else {
											p.resolve(resolved);
										}
									}
								);
							} else {
								p.resolve(resolved);
							}
						}
					);
				}
			}
			return p;
		},
		
		createObject: function(spec, module) {
			var p = new Promise(),
				object = module,
				objectsCreated = this.objectsCreated,
				self = this;
				
			function checkObjects(action) {
				if(--self.objectsToCreate === 0) {
					objectsCreated[action]();
				}
			}
			function objectFailed(err, promise) {
				promise.reject(err);
				checkObjects('reject');
			}

			function objectCreated(obj, promise) {
				self.modulesReady.then(function() {
					objectsCreated.progress({ object: obj, remaining: self.objectsToCreate });
					promise.resolve(obj);
					
					checkObjects('resolve');
				});
			}
			
			this.objectsToCreate++;
			try {
				// console.log("Creating", spec);
				if(spec.create && typeof module == 'function') {
					var args = isArray(spec.create) ? spec.create : [spec.create];
					// console.log("createObject ", spec, args);
					this.parse(args).then(
						function(resolvedArgs) {
							// console.log("Instantiating module", spec);
							objectCreated(instantiate(module, resolvedArgs), p);
						},
						objectFailed
					);
				} else {
					objectCreated(object, p);
				}
				
			} catch(e) {
				objectFailed(e);
			}

			return p;
		},
		
		initObject: function(spec, object) {
			var promisor = new Promise(),
				domReady = this.domReady,
				self = this;
			
			if(spec.properties) {
				var props = spec.properties,
					propsArr = keys(props);
				
				var count = propsArr.length;
				for(var i=0; i<propsArr.length; i++) {
					(function() {
						var p = propsArr[i];
						self.parse(props[p]).then(function(resolved) {
							//TODO: Support setter plugins
							object[p] = resolved;
							if(--count == 0) {
								promisor.resolved(object);
								self.fireEvent('onProperties', object, spec);
							}
						}, reject(self.contextReady));
					})();
				}
			}
			
			if(spec.init) {
				this.processFuncList(spec.init, object, spec,
					function(target, spec, func, args) {
						domReady.then(function() {
							self.callInit(target, spec, func, args);
						});
					}
				);
			}
			
			if(spec.destroy) {
				this.destroyers.push(function() {
					self.processFuncList(spec.destroy, object, spec, function(target, spec, func, args) {
						func.apply(target, []); // no args for destroy
					});
				});
			}
			
			return promisor;
		},
		
		processFuncList: function(list, target, spec, callback) {
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
		},

		callInit: function(target, spec, func, args) {
			var self = this;
			this.parse(args).then(function(processedArgs) {
				func.apply(target, isArray(processedArgs) ? processedArgs : [processedArgs]);
				self.fireEvent('onInit', target, spec);
			});
		},

		addReadyInit: function(target, spec, func, args) {
			var self = this;
			this.domReady.then(function() {
				self.callInit(target, spec, func, args);
			});
		},

		loadModule: function(moduleId) {
			var p = new Promise();

			if(!this.uniqueModuleNames[moduleId]) {
				this.uniqueModuleNames[moduleId] = 1;
				this.moduleIds.push(moduleId);
			}

			this.modulesReady.then(function() {
				p.resolve(getLoadedModule(moduleId));
			});
			
			return p;
		},
		
		scanPlugins: function(modules) {
			var p = new Promise();
			
			var setters = this.setters,
				resolvers = this.resolvers;

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

				if(newPlugin.wire$listeners) {
					this.addEventListeners(newPlugin.wire$listeners);
				}

				if(typeof newPlugin.wire$init == 'function') {
					// Have to init plugins immediately, so they can be used during wiring
					newPlugin.wire$init();
				}
			}

			p.resolve();
			return p;
		},
		
		addEventListeners: function(listener) {
			var listeners = this.listeners;
			for(var p in listeners) {
				if(typeof listener[p] == 'function') {
					listeners[p].push(listener);
				}
			}
		},

		fireEvent: function(/* name, arg1, arg2... */) {
			var args = Array.prototype.slice.call(arguments),
				name = args.shift(),
				pluginsToCall = this.listeners[name];

			for(var i=0; i<pluginsToCall.length; i++) {
				var plugin = pluginsToCall[i];
				plugin[name].apply(plugin, args);
			}
		},

		wire: function(spec) {
			var contextReady = this.contextReady,
				modulesReady = this.modulesReady,
				objectsCreated = this.objectsCreated,
				domReady = this.domReady,
				moduleIds = this.moduleIds,
				myContext = this.context,
				parent = this.parent,
				self = this,
				rejectPromise = function rejectAndFireEvent(promise, message, err) {
					self.fireEvent('onContextError', context, message, err);
					rejectPromise(promise, err);
				};

			// domReady must resolve after contextReady, but have to register this
			// with onDomReady as early as possible because requirejs doesn't fire
			// domReady callbacks after the dom is actually ready!
			onDomReady(function resolveDomReady() {
				contextReady.then(function(context) {
					domReady.resolve(context);
				});
			});

			modulesReady.then(
				function resolveModulesReady(modules) {
					self.fireEvent('onContextInit', modules);
				},
				function rejectModulesReady() {
					rejectPromise(objectsCreated, "Module loading failed");
				});

			objectsCreated.then(
				function resolveObjectsCreated() {
					// console.log("All objects created");
				},
				function rejectObjectsCreated() {
					rejectPromise(contextReady, "Object creation failed");
				},
				function progressObjectsCreated(status) {
					self.fireEvent("onCreate", status.object);
				}
			);

			contextReady.then(
				function resolveContextReady(context) {
					self.fireEvent('onContextReady', context);
				},
				function rejectContextReady() {
					rejectPromise(domReady, "Context creation failed");
				}
			);
			
			if(parent) {
				mixin(myContext, parent.context);
				parent.contextDestroyed.then(function() { self.destroy(); });
			}

			try {
				this.parse(spec, myContext).then(function(context) {
					context.wire = function wire(spec) {
						return new ContextFactory(self).wire(spec);
					};

					context.resolve = function resolve(ref) {
						return self.resolveName(ref).promise();
					};

					context.destroy = function destroy() {
						return self.destroy().promise();
					};
					
					contextReady.resolve(context);
				}, reject(objectsCreated));

				loadModules(moduleIds, function() {
					var modules = arguments;
					self.scanPlugins(modules).then(function() {
						modulesReady.resolve(modules);
					});
				});

			} catch(e) {
				contextReady.reject(e);
			}

			return contextReady.promise();
		},
		
		destroy: function() {
			var self = this;
						
			this.contextReady.then(
				function(context) {
					var destroyers = self.destroyers;
					for(var i=0; i<destroyers.length; i++) {
						destroyers[i]();
					}

					self.contextDestroyed.resolve();
					self.fireEvent('onContextDestroy', context);
				}
			);
			
			this.domReady.reject("Context destroyed");
			return this.contextDestroyed;
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
					this.parse(spec[i]).then(resolveArray, reject(self.objectsCreated));
				}


			} else if(typeof spec == 'object') {
				// module, reference, or simple object
				if(isModule(spec)) {
					// console.log("Module", spec);
					// Create object from module
					// console.log("New module to create, total now: " + this.objectsToCreate, spec);
					this.loadModule(spec.module).then(
						function(module) {
							self.createObject(spec, module).then(
								function(created) {
									promisor.resolve(created);
							
									self.objectsCreated.then(function() {
										return self.initObject(spec, created);
									}, reject(self.objectsCreated));

								},
								function(err) {
									self.objectsCreated.reject();
								}
							);
						},
						reject(this.modulesReady)
					);
					

				} else if(isRef(spec)) {
					// console.log("Ref", spec);
					// Resolve reference
					this.resolveRef(spec).then(
						function(target) {
							promisor[target === undef ? 'reject' : 'resolve'](target);
						},
						reject(this.objectsCreated)
					);

				} else {
					// console.log("POJO", spec);
					// this.objectsToCreate++;

					// Recurse on plain object properties
					processed = result||{};
					var props = keys(spec);

					len = props.length;
					if(len == 0) {
						promisor.resolve(processed);
						// console.log("empty", spec);
					} else {
						// console.log("resolving POJO", len, spec);
						var propCount = len;
						for(var j=0; j<len; j++) {
							var propToCreate = spec[props[j]],
								resolveObject = (function() {
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
							this.parse(spec[props[j]]).then(
								resolveObject, 
								reject(this.objectsCreated)
							);
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
				
			/*
				Function: fireEvent
				Invokes the set of plugins registered under the name (first param), e.g. "onContextInit", and
				passes all subsequent parameters as parameters to each plugin in the set.  This not only
				invokes plugins registered with this context, but with all ancestor contexts as well.
				
				Parameters:
					name - First argument is the name of the plugin type to call, e.g. "onContextInit"
					args - Arguments to be passed to plugins
			*/

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

			function destroyObject(target, spec) {
				var destroy = spec.destroy;
				processFuncList(spec.destroy, target, spec, function(target, spec, func, args) {
					func.apply(target, []); // no args for destroy
				});
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
		var promise;
		if(rootContext === undef) {
			// No root context yet, so wire it first, then wire the requested spec as
			// a child.  Subsequent wire() calls will reuse the existing root context.
			promise = new Promise();
			
			new ContextFactory().wire(rootSpec).then(function(context) {
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
		
		return promise.promise(); // Return restricted promise
	};
	
	w.version = VERSION;

})(window);
