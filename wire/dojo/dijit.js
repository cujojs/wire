/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	Package: dijit.js
	wire plugin that provides a reference resolver for dijits declared using
	dojoType/data-dojo-type, a setter that can set dojo 1.6+ set(name, value)
	style properties, a wire$init() function that invokes the dojo parser,
	and an object lifecycle handler that will cleanup (e.g. destroyRecursive,
	or destroy) dijits instantiated "programmatically" in a wiring context.
*/
define(['dojo', 'dojo/parser', 'dijit', 'dijit/_Widget'], function(dojo, parser, dijit, Widget) {
	var parsed = false;

	/*
		Function: dijitById
		Resolver for dijits by id.		
	*/
	function dijitById(promise, name /*, refObj, wire */) {
		dojo.ready(
			function() {
				var resolved = dijit.byId(name);

				if(resolved) {
					promise.resolve(resolved);
				} else {
					throw new Error("No dijit with id: " + name);
				}
			}
		);
	}

	function isDijit(it) {
		// NOTE: It is possible to create inheritance hierarchies with dojo.declare
		// where the following evaluates to false *even though* dijit._Widget is
		// most certainly an ancestor of it.
		// So, may need to modify this test if that seems to happen in practice.
		return it instanceof Widget;
	}

	function createDijitProxy(object /*, spec */) {
		var proxy;

		if(isDijit(object)) {
			proxy = {
				get: function(property) {
					return object.get(property);
				},
				set: function(property, value) {
					return object.set(property, value);
				},
				invoke: function(method, args) {
					return method.invoke(object, args);
				}
			};
		}

		return proxy;
	}

	function destroyDijit(target) {
		// Prefer destroyRecursive over destroy
		if (typeof target.destroyRecursive == 'function') {
			target.destroyRecursive(false);

		} else if (typeof target.destroy == 'function') {
			target.destroy(false);

		}
	}
	
	return {
		wire$plugin: function(ready, destroy, options) {
			// Only ever parse the page once, even if other child
			// contexts are created with this plugin present.
			if(options.parse && !parsed) {
				parsed = true;
				dojo.ready(function() { parser.parse(); });
			}

			// Track dijits that this plugin instance creates, so we only
			// destroy those, and skip any that might have been created in the
			// HTML via dojoType and then $ref'd.
			var dijitsToDestroy = [];

			destroy.then(function() {
				var destroyMe, i;
				for(i = 0; (destroyMe = dijitsToDestroy[i]); i++) {
					destroyDijit(destroyMe);
				}
			});

			// Return plugin
			return {
				resolvers: {
					dijit: dijitById
				},
				proxies: [
					createDijitProxy
				],
				create: function(resolver, proxy /*, wire */) {
					// It's a dijit, so we need to know when it is being
					// destroyed so that we can do proper dijit cleanup on it
					var target = proxy.target;
					if (isDijit(target)) {
						dijitsToDestroy.push(target);
					}
					resolver.resolve();
				}
			};
		}
	};
});