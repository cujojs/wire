//
// TODO:
// 1. Build dependency graph for $refs and process second pass in dependency order
//

var wire = (function(){

	var VERSION = "0.1",
		tos = Object.prototype.toString,
		arrt = '[object Array]',
		uniqueNameCount = 0, // used to generate unique names
		undef;
		
	/*
		Function: uniqueName
		Generates a unique name.  The unique name will contain seed, if provided.
		
		Parameters:
			seed - (optional) If provided, the returned name will contain the String seed.
			
		Returns:
			A unique String name
	*/
	function uniqueName(seed) {
		return '_' + (seed ? seed : 'instance') + '_' + uniqueNameCount++;
	}

	function isArray(it) {
		return tos.call(it) === arrt;
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
		return collectModulesFromObject(spec, []);
	}
	
	function collectModulesFromObject(spec, modules) {
		if(isArray(spec)) {
			collectModulesFromArray(spec, modules);
		} else if(typeof spec == 'object') {

			if(isModule(spec)) {
				modules.push(spec.module);

				// TODO: REMOVE
				// For testing only
				// define(name, [], spec.module);

				if(spec.properties) {
					collectModulesFromObject(spec.properties, modules);
				} else if (spec.args) {
					collectModulesFromObject(spec.args, modules);
				}

			} else {
				for(var prop in spec) {
					collectModulesFromObject(spec[prop], modules);
				}
			}
		}
		
		return modules;
	}
		
	function collectModulesFromArray(arr, modules) {
		for (var i = arr.length - 1; i >= 0; i--){
			collectModulesFromObject(arr[i], modules);
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
		Class: Context
		
		The IOC container where object wiring occurs.  Contexts are hierarchical
		and resolve similar to prototypes in that a Context can see and resolve
		references in its base (ancestors), but not its descendents.
	 */
	/*
		Constructor: Context
		Creates a new Context with the supplied base Context.
		
		Parameters:
			modules - AMD module names loaded in this Context
			base - base (parent) Context.  Objects in the base are available
				to this Context.
	*/
	var Context = function Context(modules, base) {
		this.modules = modules;
		this.base = base;
		this.version = VERSION;
	};
	
	/*
		Function: wire
		Wires a new, child of this Context, and passes it to the supplied
		ready callback, if provided
		
		Parameters:
			spec - wiring spec
			ready - Function to call with the newly wired child Context
	*/
	Context.prototype.wire = function wire(spec, ready) {
		wireFromSpec(spec, this, ready);
	};
	
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
	function wireFromSpec(spec, base, ready) {
		// 1. First pass, build module list for require, call require
		// 2. Second pass, depth first instantiate 
		
		if(typeof base == "function") {
			ready = base;
			base = undef;
		}
		
		// First pass
		var modules = collectModules(spec);
		
		// Second pass happens after modules loaded
		loadModules(modules, function() {
			var start = new Date().getTime();

			// Second pass, construct context and object instances
			var context = new Context(modules, base);
			
			context.get = (function get() {
				// TODO: There just has to be a better way to do this and keep
				// the objects hash private.
				var objects = {};
				
				function constructWithFactory(spec, name) {
					var module = getLoadedModule(name);
					if(!module) {
						throw Error("ERROR: no module loaded with name: " + name);
					}

					var func = spec.create.name,
						args = spec.create.args ? construct(spec.create.args) : [];

					return module[func].apply(module, args);
				}

				function constructWithNew(spec, name) {
					var module = getLoadedModule(spec.module);
					if(!module) {
						throw Error("ERROR: no module loaded with name: " + name);
					}

					return spec.create ? instantiate(module, construct(spec.create)) : new module();
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
					// TODO: plugins for property setting?
					var set = typeof target.set == 'function'
						? function(key, value) { target.set(key, construct(value)); }
						: function(key, value) { target[key] = construct(value); };

					for(var p in properties) {
						set(p, construct(properties[p], p));
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
							if(spec.create) {
								// TODO: Handle calling a factory method and using the return value as result? See constructWithFactory()
								// console.log('constructing ' + name + " from " + spec.module);
								result = constructWithNew(spec, name);
							} else {
								// console.log('setting ' + name + ' as module ' + spec.module + ' directly');
								result = getLoadedModule(spec.module);
							}

							if(spec.properties && typeof spec.properties == 'object') {
								// console.log("setting props on " + spec.name);

								setProperties(result, spec.properties);
							}

							// If it has init functions, call it
							if(spec.init) {
								processFuncList(spec.init, result, addReadyInit);
							}

							if(name) objects[name] = result;

						} else if (isRef(spec)) {
							result = resolve(spec.$ref);
						} else {
							result = {};
							for(var prop in spec) {
								result[prop] = construct(spec[prop], prop);
							}
						}
					} else {
						if(name) objects[name] = result;
					}

					return result;
				}

				function resolve(ref) {
					return objects[ref] || (base && base.get(ref)) || undef;
				}
				
				construct(spec);

				return resolve;
			})();
			
			console.log((new Date().getTime()) - start);
			
			// Call callback when entire context is ready
			// TODO: Return a promise instead?
			if(ready) ready(context);
		});

	};
	
	/*
		Variable: rootContext
		The top-level root of all Contexts.
	*/
	var rootContext;
	wireFromSpec({}, function(context) { rootContext = context; });

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
