//
// TODO:
// 1. Build dependency graph for $refs and process second pass in dependency order
//

var wire = (function(){

	var tos = Object.prototype.toString,
		arrt = '[object Array]',
		uniqueNameCount = 0, // used to generate unique names
		requires = [], // amd module names to be loaded
		deps = {}, // dependency graph
		context = {},
		undef;
		
	function uniqueName(seed) {
		return '_' + (seed ? seed : 'instance') + '_' + uniqueNameCount++;
	}
	
	function isModule(spec) {
		return spec.module;
	}
	
	function isRef(spec) {
		return spec.$ref !== undef;
	}
	
	function isArray(it) {
		return tos.call(it) === arrt;
	}
	
	function pivot(map) {
		// Pivots a map of key -> array, and returns the pivoted version
		// map: Object
		// 		Must be a set of key -> array pairs
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
		// Look for modules in objects and arrays.  Skip simple values
		// in this pass.
		if(isArray(spec)) {
			collectModulesFromArray(spec);
		} else if(typeof spec == 'object') {
			
			if(isModule(spec)) {
				requires.push(spec.module);
				
				// TODO: REMOVE
				// For testing only
				// define(name, [], spec.module);

				if(spec.properties) {
					collectModules(spec.properties);
				} else if (spec.args) {
					collectModules(spec.args);
				}

			} else {
				for(var prop in spec) {
					collectModules(spec[prop], prop);
				}
			}
		}
	}

	function collectModulesFromArray(arr) {
		for (var i = arr.length - 1; i >= 0; i--){
			collectModules(arr[i]);
		};
	}
	
	function loadModules(moduleNames, callback) {
		require(moduleNames, callback);
	}
	
	function getLoadedModule(name) {
		return require(name);
	}
	
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
		
		return spec.create ? instantiate(module, spec.create) : new module();
	}
	
	function instantiate(ctor, args) {
		var factory = function Factory(ctor, args) {
			return ctor.apply(this, args);
		};
		factory.prototype = ctor.prototype;
		return new factory(ctor, construct(args));
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
			console.log("calling " + list + "()");
			func = target[list];
			if(typeof func == "function") {
				callback(target, func, []);
			}
		} else {
			for(var f in list) {
				console.log("calling " + f + "(" + list[f] + ")");
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
			var len = spec.length;
		
			result = [];
			for (var i=0; i < len; i++) {
				result.push(construct(spec[i]));
			};
		
		} else if(typeof spec == 'object') {
			// If it's a module
			//  - if it has a create function, call it, with args and set result
			//  - if no factory function, invoke new as constructor and set result
			//  - if init function, invoke after factory or constructor
			// If it's not a module
			//  - recursive construct() and set result
			if(isModule(spec)) {
				name = name || spec.name;
				if(spec.create) {
					console.log('constructing ' + name + " from " + spec.module);
					result = constructWithNew(spec, name);
				} else {
					console.log('setting ' + name + ' as module ' + spec.module + ' directly');
					result = getLoadedModule(spec.module);
				}
				
				if(spec.properties && typeof spec.properties == 'object') {
					console.log("setting props on " + spec.name);
					
					setProperties(result, spec.properties);
				}

				// If it has init functions, call it
				if(spec.init) {
					processFuncList(spec.init, result, addReadyInit);
				}
				
				if(name) context[name] = result;
				
			} else if (isRef(spec)) {
				result = resolve(spec.$ref);
			} else {
				result = {};
				for(var prop in spec) {
					result[prop] = construct(spec[prop], prop);
				}
			}
		} else {
			if(name) context[name] = result;
		}

		return result;
	}
	
	function resolve(ref) {
		// Resolve a reference
		// TODO: Plugins for resolving references?
		
		return context[ref];
	}

	// main wire() export
	var w = function(spec, ready) {
		// 1. First pass, build module list for require, call require
		// 2. Second pass, depth first instantiate 
		
		// First pass
		collectModules(spec);
		
		// Second pass happens after modules loaded by require loader
		require(requires, function() {
			// Second pass, construct actual instances
			var context = construct(spec);
			
			// Call callback when entire context is ready
			ready(context);
		});

	};
	
	// Export other helpers
	w.construct = construct;
	w.resolve = resolve;
	
	return w;
})();

// Fake require.  REMOVE!!!  Testing only

(function(window){
	var modules = {},
		uniqueNameCount = 0,
		tos = Object.prototype.toString,
		arrt = '[object Array]';
	
	function uniqueName() {
		return "_" + uniqueNameCount++;
	}
	
	if(!window.define) {
		window.define = function(name, deps, factory) {
			if(!factory) {
				name = uniqueName();
				deps = name;
				factory = deps;
			}
			
			if(!(name in modules)) {
				modules[name] = typeof factory == "function" ? factory() : factory;
			}
		};
	}
	
	if(!window.require) {	
		var r = window.require = function(deps, callback) {
			if(tos.call(deps) === arrt) {
				// deps is an array
				var args = [];
				for (var i=0; i < deps.length; i++) {
					args.push(modules[deps[i]]);
				};
				return callback.apply(null, args);
			}
			else {
				// deps is a name
				var module = modules[deps];
				return module;
			}
		};
		
		r.ready = function(func) {
			func();
		};
	}

})(window);

