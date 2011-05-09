/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: dijit.js
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
	function dijitById(promise, name, refObj, wire) {
		dojo.ready(
			function() {
				var resolved = dijit.byId(name);

				if(resolved) {
					promise.resolve(resolved);
				} else {
					throw new Error("Unresolved dijit ref",name, refObj);
					// promise.reject();
				}
			}
		);
	}

	function setDijitProperty(object, property, value) {
		if(typeof object.set == 'function') {
			object.set(property, value);
			return true;
		}

		return false;
	}
	
	return {
		wire$plugin: function onWire(ready, destroy, options) {
			// Only ever parse the page once, even if other child
			// contexts are created with this plugin present.
			if(options.parse && !parsed) {
				parsed = true;
				dojo.ready(function() { parser.parse(); });
			}

			ready.then(null, null, function(update) {
				// Only care about objects that are dijits
				if(update.target instanceof Widget) {

					// It's a dijit, so we need to know when it is being
					// destroyed so that we can do proper dijit cleanup on it
					update.destroyed.then(function(target) {
						// Prefer destroyRecursive over destroy
						if(typeof target.destroyRecursive == 'function') {
							target.destroyRecursive(false);

						} else if(typeof target.destroy == 'function') {
							target.destroy(false);

						}
					});					
				}
			});

			// Return plugin
			return {
				resolvers: {
					dijit: dijitById
				},
				setters: [
					setDijitProperty
				]
			};
		}
	};
});