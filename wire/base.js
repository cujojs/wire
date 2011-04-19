/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: base.js
	Base wire plugin that provides a reference resolver to resolve objects by name,
	and a setter plugin that sets basic Javascript properties, e.g. object.prop = value.
*/
define([], function() {
	var tos, destroyFuncs, undef;

	tos = Object.prototype.toString;
	destroyFuncs = [];

	function isArray(it) {
		return tos.call(it) == '[object Array]';
	}

	function invoke(promise, func, target, args, wire) {
		var f = target[func];
		if(typeof f == 'function') {
			if(args) {
				wire(args).then(function(resolvedArgs) {
					try {
						var result = f.apply(target, (tos.call(resolvedArgs) == '[object Array]')
							? resolvedArgs
							: [resolvedArgs]);
						promise.resolve(result);

					} catch(e) {
						promise.reject(e);

					}
				});
			}			
		}
	}

	function invokeAll(promise, aspect, wire) {
		var target, options;

		target  = aspect.target;
		options = aspect.options;

		if(typeof options == 'string') {
			invoke(promise, options, target, [], wire);

		} else {
			var promises, p;
			promises = [];

			for(var func in options) {
				p = wire.promise();
				promises.push(p);
				invoke(p, func, target, options[func], wire);
			}
			
			wire.whenAll(promises).then(function() {
				promise.resolve();
			});
		}
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

	function moduleFactory(promise, spec, wire) {
		var moduleId, args;
		
		moduleId = spec.create 
			? typeof spec.create == 'string' ? spec.create : spec.create.module
			: spec.module;

		// Load the module, and use it to create the object
		wire.load(moduleId, spec).then(function(module) {
			// We'll either use the module directly, or we need
			// to instantiate/invoke it.
			if(spec.create && typeof module == 'function') {
				// Instantiate or invoke it and use the result
				if(typeof spec.create == 'object' && spec.create.args) {
					args = isArray(spec.create.args) ? spec.create.args : [spec.create.args];
				} else {
					args = [];
				}

				wire(args).then(function(resolvedArgs) {

					var object = instantiate(module, resolvedArgs);
					promise.resolve(object);

				});

			} else {
				// Simply use the module as is
				promise.resolve(module);
				
			}
		});
	}

	function literalFactory(promise, spec, wire) {
		if(spec.wire$literal === true) {
			delete spec.wire$literal;
			promise.resolve(spec);					
		} else {
			promise.resolve(spec.wire$literal);
		}
	}
	    				
	return {
		wire$plugin: function(ready, destroyed, options) {
			return {
				factories: {
					wire$literal: literalFactory,
	    			create: moduleFactory
				},
				aspects: {
					// properties aspect.  Sets properties on components
					// after creation.
					properties: {
						created: function(promise, aspect, wire) {
							var options, promises, p, val;

							promises = [];
							options = aspect.options;

							for(var prop in options) {
								p = wire.promise();
								promises.push(p);
								
								val = options[prop];
								console.log("before prop", prop, val);
								wire(val).then(function(resolvedValue) {
									console.log("setting prop", prop, val, resolvedValue);
									aspect.set(prop, resolvedValue);
									p.resolve();
								});

							}

							wire.whenAll(promises).then(function() {
								promise.resolve();
							});
						}
					},
					// init aspect.  Invokes methods on components after
					// they have been configured
					init: {
						configured: function(promise, aspect, wire) {
							invokeAll(promise, aspect, wire);
						}
					},
					// destroy aspect.  Registers methods to be invoked
					// on components when the enclosing context is destroyed
					destroy: {
						initialized: function(promise, aspect, wire) {
							promise.resolve();

							destroyFuncs.push(function destroyObject() {
								invokeAll(wire.promise(), aspect, wire);
							});
						}
					}
				},
				setters: [
					/*
						Function: set
						Basic setter that sets simple Javascript properties.  This is the
						fallback setter that is used if no other setters can handle setting
						properties for a particular object.
						
						Parameters:
							object - Object on which to set property
							property - String name of property to set on object
							value - value to which to set property
							
						Returns:
						Always returns true.  In general, though, setters should return true if they
						have successfully set the property, or false (strict false, not falsey)
						if they cannot set the property on the object.
					*/
					function set(object, property, value) {
						object[property] = value;
						return true;
					}
				]
			};				
		}
	};
});