/*
	File: dijit.js
	wire dijit plugin that provides a dijit! resolver, setter, and
	manages the lifecycle of dijits created using wire ("programmatic"
	dijits, not dojoType/data-dojo-type dijits).
*/
/**
 * @license Copyright (c) 2010 Brian Cavalier
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
define(['dojo', 'dojo/parser', 'dijit'], function(dojo, parser, dijit) {
	var parsed = false;

	/*
		Function: dijitById
		Resolver for dijits by id.		
	*/
	function dijitById(promise, name, refObj, wire) {
		console.log("dijit resolver 1", name);
		dojo.ready(
			function() {
				console.log("dijit resolver 2", name);
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

			destroy.then(null, null,
				function onObjectDestroyed(progress) {
					if(typeof progress.target.declaredClass == 'string') {
						var object = progress.target;

						// Prefer destroyRecursive over destroy
						if(typeof object.destroyRecursive == 'function') {
							object.destroyRecursive(false);

						} else if(typeof object.destroy == 'function') {
							object.destroy(false);

						}
					}
				}
			);

			return {
				resolvers: {
					dijit: dijitById
				},
				setters: [
					setDijitProperty
				]
			}
		}
	};
});