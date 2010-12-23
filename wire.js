//
// TODO:
// - Build dependency graph for refs and process second pass in dependency order
// - Plugin infrastructure for loading modules (how to bootstrap??), resolving references,
//    and setting properties
//    - Plugins should be simple to write, maybe just an AMD module that returns a function or hash of functions?
// - Use a data attribute on wire.js script tag to load wiring spec?
// - Allow easier loading of modules that don't actually need to be references, like dijits that
//    might be used for data-dojo-type
// 
var wire = (function(){

	var VERSION = "0.1",
		tos = Object.prototype.toString,
		arrt = '[object Array]',
		uniqueNameCount = 0, // used to generate unique names
		undef;
		
	// WARNING: Unsafe!!! just for testing for now
	var head = document.getElementsByTagName('head')[0],
		scripts = document.getElementsByTagName('script');
	for(var i=0; i<scripts.length; i++) {
		var script = scripts[i],
			src = script.src,
			specUrl;
			
		if(/wire\.js(\W|$)/.test(src) && (specUrl = script.getAttribute('data-wire-spec'))) {
			loadSpec(head, specUrl);
		}
	}
	
	function loadSpec(head, specUrl) {
		var script = document.createElement('script');
		script.src = specUrl;
		head.appendChild(script);
	}
		
	/*
		Function: uniqueName
		Generates a unique name.  The unique name will contain seed, if provided.
		
		Parameters:
			seed - (optional) If provided, the returned name will contain the String seed.
			
		Returns:
			A unique String name
	*/
	function uniqueName(seed) {
		return '_' + (seed ? seed : 'instance') + uniqueNameCount++;
	}

	function isArray(it) {
		return tos.call(it) === arrt;
	}

	function timer() {
		var start = new Date().getTime();
		return function() {
			return new Date().getTime() - start;
		};
	}
	
	function isModule(spec) {
		return spec.module;
	}
	
	function isRef(spec) {
		return spec.$ref !== undef;
	}
	
	/*
		Function: pivot
		Pivots a map of key -> array
		
		Parameters:
			map - hash of key -> array pairs
			
		Returns:
			Pivoted version of map
	*/
	function pivot(map) {
		var pivoted = {};
		
		for(var p in map) {
			var arr = map[p];
			for (var i = arr.length - 1; i >= 0; i--){
				var key = arr[i];
				if(!pivoted[key]) {
					pivoted[key] = [];
				}
				
				pivoted[key].push(p);
			};
		}
		
		return pivoted;
	}
	
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
					collectModulesFromObject(spec.args, modules, uniqueModuleNames);
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

	function loadModules(moduleNames, callback) {
		// TODO: Plugins for loading/resolving modules?
		require(moduleNames, callback);
	}
	
	function getLoadedModule(name) {
		// TODO: Plugins for loading/resolving modules?
		return require(name);
	}

	var Factory = function Factory(ctor, args) {
			return ctor.apply(this, args);
		};

	function instantiate(ctor, args) {
		Factory.prototype = ctor.prototype;
		Factory.prototype.constructor = ctor;
		return new Factory(ctor, args);
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
		var context = {
			base: base,
			modules: moduleNames,
			/*
				Function: wire
				Wires a new, child of this Context, and passes it to the supplied
				ready callback, if provided

				Parameters:
					spec - wiring spec
					ready - Function to call with the newly wired child Context
			*/
			wire: function(spec, ready) {
				wireContext(spec, this, ready);
			}
		};
		
		return (function wireContext(context) {
			// TODO: There just has to be a better way to do this and keep
			// the objects hash private.
			var objects = {},
				plugins = registerPlugins(modules || []);
				
			function constructWithFactory(spec, name) {
				var module = getLoadedModule(name);
				if(!module) {
					throw Error("ERROR: no module loaded with name: " + name);
				}

				var func = spec.create.name,
					args = spec.create.args ? construct(spec.create.args) : [];

				return module[func].apply(module, args);
			}

			function constructWithNew(spec, ctor) {
				return spec.create ? instantiate(ctor, construct(spec.create)) : new ctor();
			}

			function callInit(target, func, args) {
				args = args ? construct(args) : [];
				func.apply(target, isArray(args) ? args : [args]);
			}

			function addReadyInit(target, func, args) {
				require.ready(function() {
					callInit(target, func, args);
				});
			}

			function setProperties(target, properties) {
				var setters = plugins.setters;
				for(var p in properties) {
					var success = false,
						i = 0,
						value = construct(properties[p], p);
					// Try all the registered setters until we find one that reports success
					while(i++ < setters.length && !success) {
						success = setters[i](target, p, value);
					}
					
					// If none succeeded, fall back to plain property value
					if(!success) {
						target[p] = value;
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
			
			function constructContext(spec) {
				for(var prop in spec) {
					defineObject(prop, construct(spec[prop], prop));
				}
			}
			
			function defineObject(name, value) {
				if(name in objects) {
					throw new Error("Object " + name + " is already defined in this context, cannot overwrite");
				}
				
				name && (objects[name] = value);
			}

			function construct(spec, name) {
				// By default, just return the spec if it's not an object or array
				var result = spec;

				// If spec is an object or array, process it
				if(isArray(spec)) {
					// If it's an array, construct() each element
					result = [];
					for (var i=0; i < spec.length; i++) {
						result.push(construct(spec[i]));
					}

				} else if(typeof spec == 'object') {
					// If it's a module
					//  - if it has a create function, call it, with args and set result
					//  - if no factory function, invoke new as constructor and set result
					//  - if init function, invoke after factory or constructor
					// If it's a reference
					//  - resolve the reference directly, no recursive construction
					// If it's not a module
					//  - recursive construct() and set result
					if(isModule(spec)) {
						name = name || spec.name;
						result = getLoadedModule(spec.module);
						if(!result) {
							throw new Error("No module loaded with name: " + name);
						}
						
						if(spec.create) {
							// TODO: Handle calling a factory method and using the return value as result?
							// See constructWithFactory()
							// console.log('constructing ' + name + " from " + spec.module);
							result = constructWithNew(spec, result);
						}

						if(spec.properties && typeof spec.properties == 'object') {
							// console.log("setting props on " + spec.name);

							setProperties(result, spec.properties);
						}

						// If it has init functions, call it
						if(spec.init) {
							processFuncList(spec.init, result, addReadyInit);
						}

					} else if (isRef(spec)) {
						result = resolve(spec.$ref);
						if(result === undef) throw new Error("Reference " + spec.$ref + " cannot be resolved");

					} else {
						result = {};
						for(var prop in spec) {
							result[prop] = construct(spec[prop], prop);
						}
						
					}
				}

				return result;
			}
			
			function resolve(ref) {
				var resolved,
					resolvers = plugins.resolvers;
				if(ref.indexOf("!") == -1) {
					resolved = get(ref);
					
					// TODO: Move this code to a plugin somehow?
					// This will attempt to resolve a non-prefixed reference using all
					// registered resolvers.  Seems simultaneously useful and dangerous.
					// I don't think it belongs in the core, but maybe a resolver plugin
					// so that the user can decide whether to allow it or not.
					// if(resolved === undef) {
					// 	for(prefix in resolvers) {
					// 		resolved = resolvers[prefix](ref, context);
					// 		if(resolved !== undef) {
					// 			break;
					// 		}
					// 	}
					// }
					
					return resolved;
					
				} else {
					var parts = ref.split("!");
					
					if(parts.length == 2) {
						var prefix = parts[0];

						if(prefix in resolvers) {
							var name = parts[1];
							resolved = resolvers[prefix](name, context);
						}
					}

					return resolved || base && base.resolve(ref) || undef;
				}
			}
			
			function get(name) {
				return objects[name] || base && base.get(name) || undef;
			}
			
			context.resolve = resolve;
			context.get = get;

			constructContext(spec);

			return context;
		})(context);
	}
	
	function registerPlugins(modules) {
		var plugins = {
			resolvers: {},
			setters: []
		};
		
		for (var i=0; i < modules.length; i++) {
			var newPlugin = modules[i];
			// console.log("scanning for plugins: " + newPlugin);
			if(newPlugin.wire$resolvers) {
				for(var name in newPlugin.wire$resolvers) {
					// console.log("resolver plugin: " + name);
					plugins.resolvers[name] = newPlugin.wire$resolvers[name];
				}
			}
			if(newPlugin.wire$setters) {
				// console.log('setter plugin');
				plugins.setters.concat(newPlugin.wire$setters);
			}
			
			if(typeof newPlugin.wire$init == 'function') {
				newPlugin.wire$init();
			}
		}
		
		return plugins;
	}
	
	/*
		Function: wireFromSpec
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

		var t = timer();

		// First pass
		var modules = collectModules(spec);
		console.log("modules scanned: " + t() + "ms");
		console.log(modules);
		
		// Second pass happens after modules loaded
		loadModules(modules, function() {
			console.log("modules loaded: " + t() + "ms");
			
			// Second pass, construct context and object instances
			var context = createContext(spec, modules, arguments, base);
			
			console.log("total: " + t() + "ms");
			
			// Call callback when entire context is ready
			// TODO: Return a promise instead?
			if(ready) ready(context);
		});

	};
	
	/*
		Variable: rootContext
		The top-level root of all Contexts.
	*/
	var rootContext = createContext({}, []);

	/*
		Function: wire
		Global wire function that is the starting point for wiring applications.
		
		Parameters:
			spec - wiring spec
			ready - Function to call with the newly wired Context
	*/
	var w = function wire(spec, ready) {
		rootContext.wire(spec, ready);
	};
	
	w.version = VERSION;
	
	return w;
})();
