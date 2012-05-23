/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/base plugin
 * Base wire plugin that provides properties, init, and destroy facets, and
 * a proxy for plain JS objects.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define) {
define(['when', './lib/array', './lib/object', './lib/component'], function(when, array, object, createComponent) {

	var whenAll, chain;
	
	whenAll = when.all;
    chain = when.chain;

	function invoke(func, facet, args, wire) {
        return when(wire(args),
			function (resolvedArgs) {
				return facet.invoke(func, array.isArray(resolvedArgs)
					? resolvedArgs
					: [resolvedArgs]);
			}
		);
    }

    function invokeAll(facet, wire) {
		var options = facet.options;

		if(typeof options == 'string') {
			return invoke(options, facet, [], wire);

		} else {
			var promises, func;
			promises = [];

			for(func in options) {
				promises.push(invoke(func, facet, options[func], wire));
			}

			return whenAll(promises);
		}
	}

    /**
     * Factory that handles cases where you need to create an object literal
     * that has a property whose name would trigger another wire factory.
     * For example, if you need an object literal with a property named "create",
     * which would normally cause wire to try to construct an instance using
     * a constructor or other function, and will probably result in an error,
     * or an unexpected result:
     * myObject: {
     *      create: "foo"
     *    ...
     * }
     *
     * You can use the literal factory to force creation of an object literal:
     * myObject: {
     *    literal: {
     *      create: "foo"
     *    }
     * }
     *
     * which will result in myObject.create == "foo" rather than attempting
     * to create an instance of an AMD module whose id is "foo".
     */
	function literalFactory(resolver, spec /*, wire */) {
		resolver.resolve(spec.literal);
	}

	function protoFactory(resolver, spec, wire) {
		var parentRef, promise;
        
        parentRef = spec.prototype;
        
        promise = typeof parentRef === 'string'
                ? wire.resolveRef(parentRef)
                : wire(parentRef);
        
        when(promise,
			function(parent) {
				var child = object.create(parent);
				resolver.resolve(child);
			},
            resolver.reject
		);
	}

	function propertiesFacet(resolver, facet, wire) {
		var options, promises, prop;
		promises = [];
		options = facet.options;

		for(prop in options) {
			promises.push(setProperty(facet, prop, options[prop], wire));
		}

        whenAll(promises, resolver.resolve, resolver.reject);
	}

	function setProperty(proxy, name, val, wire) {
		var wired = wire(val, name, proxy.path);
		when(wired,
            function(resolvedValue) {
			    proxy.set(name, resolvedValue);
		    }
        );

		return wired;
	}

	function invokerFacet(resolver, facet, wire) {
		chain(invokeAll(facet, wire), resolver);
	}

	function pojoProxy(object /*, spec */) {
		return {
			get: function(property) {
				return object[property];
			},
			set: function(property, value) {
				object[property] = value;
				return value;
			},
			invoke: function(method, args) {
				if(typeof method === 'string') {
					method = object[method];
				}

				return method.apply(object, args);
			},
			destroy: function() {}
		};
	}

    //noinspection JSUnusedLocalSymbols
    /**
     * Wrapper for use with when.reduce that calls the supplied destroyFunc
     * @param [unused]
     * @param destroyFunc {Function} destroy function to call
     */
    function destroyReducer(unused, destroyFunc) {
        return destroyFunc();
    }

	function moduleFactory(resolver, spec, wire) {
		chain(wire.loadModule(spec.module, spec), resolver);
	}

	/**
	 * Factory that uses an AMD module either directly, or as a
	 * constructor or plain function to create the resulting item.
	 *
	 * @param resolver {Resolver} resolver to resolve with the created component
	 * @param spec {Object} portion of the spec for the component to be created
	 */
	function instanceFactory(resolver, spec, wire) {
		var create, module, args, isConstructor, name;

		name = spec.id;

		create = spec.create;
		if (object.isObject(create)) {
			module = create.module;
			args = create.args;
			isConstructor = create.isConstructor;
		} else {
			module = create;
		}

		// Load the module, and use it to create the object
		function handleModule(module) {
			function resolve(resolvedArgs) {
				return createComponent(module, resolvedArgs, isConstructor);
			}

			// We'll either use the module directly, or we need
			// to instantiate/invoke it.
			if (typeof module == 'function') {
				// Instantiate or invoke it and use the result
				if (args) {
					args = array.isArray(args) ? args : [args];
					return when(wire(args, { name: name }), resolve);

				} else {
					// No args, don't need to process them, so can directly
					// insantiate the module and resolve
					return resolve([]);

				}

			} else {
				// Simply use the module as is
				return module;

			}
		}

		chain(when(wire.loadModule(module, spec), handleModule), resolver);
	}

	return {
		wire$plugin: function(ready, destroyed /*, options */) {
            // Components in the current context that will be destroyed
            // when this context is destroyed
			var destroyFuncs = [];

			when(destroyed, function() {
                when.reduce(destroyFuncs, destroyReducer, {});
			});

			function destroyFacet(resolver, facet, wire) {
				destroyFuncs.push(function destroyObject() {
					return invokeAll(facet, wire);
				});

                // This resolver is just related to *collecting* the functions to
                // invoke when the component is destroyed.
				resolver.resolve();
			}

			return {
				factories: {
					module: moduleFactory,
					create: instanceFactory,
					literal: literalFactory,
					prototype: protoFactory
				},
				facets: {
					// properties facet.  Sets properties on components
					// after creation.
					properties: {
						configure: propertiesFacet
					},
					// init facet.  Invokes methods on components during
					// the "init" stage.
					init: {
						initialize: invokerFacet
					},
					// ready facet.  Invokes methods on components during
					// the "ready" stage.
					ready: {
						ready: invokerFacet
					},
					// destroy facet.  Registers methods to be invoked
					// on components when the enclosing context is destroyed
					destroy: {
						ready: destroyFacet
					}
				},
				proxies: [
					pojoProxy
				]
			};
		}
	};
});
})(typeof define == 'function'
	? define
    : function(deps, factory) {
		module.exports = factory.apply(this, deps.map(function(x) {
			return require(x);
		}));
	}
);
