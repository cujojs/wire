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
				p = wire.deferred();
				promises.push(p);
				invoke(p, func, target, options[func], wire);
			}
			
			wire.whenAll(promises).then(function() {
				promise.resolve();
			});
		}
	}

	function literalFactory(promise, spec, wire) {
		promise.resolve(spec.wire$literal);
	}

	function propertiesAspect(promise, aspect, wire) {
		var options, promises, p, val;

		promises = [];
		options = aspect.options;

		for(var prop in options) {

			p = wire.deferred();
			promises.push(p);

			(function(p, name, val) {
				
				wire(val).then(function(resolvedValue) {
					aspect.set(name, resolvedValue);
					p.resolve();
				});

			})(p, prop, options[prop]);
		}

		wire.whenAll(promises).then(function() {
			promise.resolve();
		});
	}

	function initAspect(promise, aspect, wire) {
		invokeAll(promise, aspect, wire);
	}

	function destroyAspect(promise, aspect, wire) {
		promise.resolve();

		destroyFuncs.push(function destroyObject() {
			invokeAll(wire.deferred(), aspect, wire);
		});
	}

	return {
		wire$plugin: function(ready, destroyed, options) {
			return {
				resolvers: {
					wire: function(promise, name, refObj, wire) {
						wire.ready.then(function(context) {
							promise.resolve(context);
						});
					}
				},
				factories: {
					wire$literal: literalFactory
				},
				aspects: {
					// properties aspect.  Sets properties on components
					// after creation.
					properties: {
						created: propertiesAspect
					},
					// init aspect.  Invokes methods on components after
					// they have been configured
					init: {
						configured: initAspect
					},
					// destroy aspect.  Registers methods to be invoked
					// on components when the enclosing context is destroyed
					destroy: {
						initialized: destroyAspect
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