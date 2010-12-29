//
// TODO:
// - Plugins for afterConstruct/beforeProperties, afterProperties/beforeInit, afterInit.
// - Plugins for overall context lifecycle: onContextInit, onContextReady, onContextDestroy
// - Support for destroying contexts, and their objects
// - Allow easier loading of modules that don't actually need to be references, like dijits that
//    might be used for data-dojo-type
// - It's easy to forget the "create" property which triggers calling a module as a constructor.  Need better syntax, or
//    maybe create should be the default?
//
var wire = (function(global, undef){

	var VERSION = "0.1",
		tos = Object.prototype.toString,
		arrt = '[object Array]',
		d = document,
		head = d.getElementsByTagName('head')[0],
		scripts = d.getElementsByTagName('script'),
		loadModules = window['require'],
		rootSpec = global.wire || {},
		rootContext; /* Variable: rootContext Top-level context */
		
	var getLoadedModule = loadModules;

	function isArray(it) {
		return tos.call(it) === arrt;
	}
	
	function isModule(spec) {
		return spec.module;
	}
	
	function isRef(spec) {
		return spec && spec.$ref !== undef;
	}
	
	/*
		Function: collectModules
		Recursively collects all the AMD modules to be loaded before wiring the spec
		
		Parameters:
			spec - wiring spec
			
		Returns:
			Array of AMD module identifiers
	*/
	function collectModules(spec) {
		return collectModulesFromObject(spec, [], {});
	}

	function collectModulesFromObject(spec, modules, uniqueModuleNames) {
		if(isArray(spec)) {
			collectModulesFromArray(spec, modules, uniqueModuleNames);
			
		} else if(typeof spec == 'object') {

			if(isModule(spec)) {
				// For tidiness, ensure that we only put each module id into the modules array
				// once.  Loaders should handle it ok if they *do* appear more than once, imho, but
				// I've seen requirejs hit an infinite loop in that case, so better to be tidy here.
				if(!(spec.module in uniqueModuleNames)) {
					modules.push(spec.module);
					uniqueModuleNames[spec.module] = 1;
				}

				if(spec.properties) {
					collectModulesFromObject(spec.properties, modules, uniqueModuleNames);
				} else if (spec.create) {
					collectModulesFromObject(spec.create, modules, uniqueModuleNames);
				}

			} else {
				for(var prop in spec) {
					collectModulesFromObject(spec[prop], modules, uniqueModuleNames);
				}
			}
		}

		return modules;
	}

	function collectModulesFromArray(arr, modules, uniqueModuleNames) {
		for (var i = arr.length - 1; i >= 0; i--){
			collectModulesFromObject(arr[i], modules, uniqueModuleNames);
		}
	}	

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
				plugins = registerPlugins(modules || []),
				objectInitQueue = [],
				refCache = {};
				
			function error(msg, data) {
				callPlugins("onContextError", msg, data);
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
					setters = [],
					plugins = {
						onContextInit: [],
						onContextError: [],
						onContextReady: [],
						afterCreate: [],
						afterProperties: [],
						afterInit: []
					};

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

					if(typeof newPlugin.wire$init == 'function') {
						// Have to init plugins immediately, so they can be used during wiring
						newPlugin.wire$init();
					}

					for(var p in plugins) {
						if(typeof newPlugin[wirePrefix + p] == 'function') {
							plugins[p].push(newPlugin);
						}
					}
				}

				plugins.setters = setters;
				plugins.resolvers = resolvers;
				
				return plugins;
			}
			
			function callPlugins() {
				var args = Array.prototype.slice.call(arguments),
					name = args.shift(),
					pluginsToCall = plugins[name];

				for(var i=0; i<pluginsToCall.length; i++) {
					var plugin = pluginsToCall[i];
					plugin[wirePrefix + name].apply(plugin, args);
				}
				
				if(base && base.callPlugins) base.callPlugins.apply(base, arguments);
			}

			/*
				Function: constructWithNew
				Invokes the supplied constructor to create a new object
				
				Parameters:
					spec - The wiring spec of the object to be constructed containing
						parameters to be passed to the constructor.
					ctor - The constructor function to be invoked.
					
				Returns:
					The newly constructed object
			*/
			function constructWithNew(spec, ctor) {
				return instantiate(ctor, createObjects(spec.create));
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

			function processFuncList(list, target, callback) {
				var func;
				if(typeof list == "string") {
					// console.log("calling " + list + "()");
					func = target[list];
					if(typeof func == "function") {
						callback(target, func, []);
					}
				} else {
					for(var f in list) {
						// console.log("calling " + f + "(" + list[f] + ")");
						func = target[f];
						if(typeof func == "function") {
							callback(target, func, list[f]);
						}
					}
				}
			}

			function callInit(target, func, args) {
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
			}

			function addReadyInit(target, func, args) {
				require.ready(function() {
					callInit(target, func, args);
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
				for(var prop in spec) {
					createObjects(spec[prop], prop);
				}

				for(var i=0; i<objectInitQueue.length; i++) {
					objectInitQueue[i]();
				}
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
						
					} else if (isRef(spec)) {
						result = resolveName(spec.$ref);
						
					} else {
						// Recursively create sub-objects
						result = {};
						for(var prop in spec) {
							result[prop] = createObjects(spec[prop], prop);
						}
					}

					// EXPERIMENTAL: Creating sub-objects on a reference.
					// Useful in some cases, such as a dijit reference, but useless/dangerous
					// in the case of a plain object!
					if(spec.properties) createObjects(spec.properties);
					if(spec.init) createObjects(spec.init);

					// Queue a function to initialize the object later, after all
					// objects have been created
					objectInitQueue.push(function() {
						if(!isRef(spec)) callPlugins('afterCreate', result, spec, resolveName);
						initObject(spec);
					});
				}

				return result;
			}
			
			function initObject(spec) {
				var result = spec;
				
				if(typeof spec._ == 'object') {
					result = initTargetObject(spec._, spec);

				} else if (isRef(spec)) {
					result = resolveName(spec.$ref);
					// EXPERIMENTAL: Setting properties and calling initializers on a reference.
					// Useful in some cases, such as dijits, but dangerous for plain objects!
					result = initTargetObject(result, spec);
					
				} else {
					result = {};
					for(var prop in spec) {
						result[prop] = resolveObject(spec[prop]);
					}
					
				}
				
				return result;
			}
			
			function initTargetObject(target, spec) {
				if(!spec.initialized) {
				
					if(spec.properties && typeof spec.properties == 'object') {
						setProperties(target, spec.properties);
						callPlugins('afterProperties', target, spec, resolveName);
					}
				
					// If it has init functions, call it
					if(spec.init) {
						processFuncList(spec.init, target, addReadyInit);
						callPlugins('afterInit', target, spec, resolveName);
					}
				
					spec.initialized = true;
				}
				
				return target;
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
				return isRef(refObj) ? resolveName(refObj.$ref, refObj) : getObject(refObj);
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
					
					if(resolved === undef) {
						// Still unresolved
						error("Reference " + ref + " cannot be resolved", name);
					} else if(isRef(resolved)) {
						// Check for recursive 
						error("Recursive $refs not allowed: " + ref + " refers to $ref " + resolved.$ref, { name: ref, resolved: resolved });
					} else {
						// Resolved, cache the resolved reference
						refCache[ref] = resolved;
					}
				}
				
				// Return the actual object
				return getObject(resolved);
			}

			function getObject(spec) {
				return (spec && spec._) || spec;
			}

			var context = {};
			for(var p in spec) {
				context[p] = getObject(spec[p]);
			}

			/*
				Function: wire
				Wires a new, child of this Context, and passes it to the supplied
				ready callback, if provided

				Parameters:
					spec - wiring spec
					ready - Function to call with the newly wired child Context
			*/
			context.wire = function wire(spec, ready) {
				wireContext(spec, { resolveName: resolveName, callPlugins: callPlugins }, ready);
			};

			context.resolve = resolveName;

			callPlugins("onContextInit", modules, moduleNames);

			constructContext(spec);

			callPlugins("onContextReady", context);

			return context;
		})();
	}
	
	/*
		Function: wireContext
		Does all the steps of parsing, module loading, object instantiation, and
		reference wiring necessary to create a new Context.
		
		Parameters:
			spec - wiring spec
			base - base (parent) Context.  Objects in the base are available
				to this Context.
			ready - Function to call with the newly wired Context
	*/
	function wireContext(spec, base, ready) {
		// 1. First pass, build module list for require, call require
		// 2. Second pass, depth first instantiate 

		// First pass
		var modules = collectModules(spec);

		// Second pass happens after modules loaded
		loadModules(modules, function() {
			// Second pass, construct context and object instances
			var context = createContext(spec, modules, arguments, base);
			
			// Call callback when entire context is ready
			// TODO: Return a promise instead?
			if(ready) ready(context);
		});

	};

	// WARNING: Probably unsafe. Just for testing right now.
	// TODO: Only do this for browser env
	
	// Find our script tag and look for data attrs
	for(var i=0; i<scripts.length; i++) {
		var script = scripts[i],
			src = script.src,
			specUrl;
		
		if(/wire\S*\.js(\W|$)/.test(src) && (specUrl = script.getAttribute('data-wire-spec'))) {
			// Use a script tag to load the wiring spec
			var specScript = d.createElement('script');
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
	var w = function wire(spec, ready) {
		if(rootContext === undef) {
			wireContext(rootSpec, null, function(context) {
				rootContext = context;
				rootContext.wire(spec, ready);
			});
		} else {
			rootContext.wire(spec, ready);
		}
	};
	
	w.version = VERSION;
		
	return w;
})(window);
