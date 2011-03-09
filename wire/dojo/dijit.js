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
define(['dojo', 'dojo/parser'], function(dojo, parser) {
	var parsed = false,
		doParse = false;
	
	return {
		wire$resolvers: {
			/*
				Function: dijit
				Resolver for dijits by id that will resolve any dijit on the page by its widget id,
				whether created declaratively with dojotype or programatically.

				Reference format:
					dijit!widget-id
				
				Parameters:
					factory - wire factory
					name - id of the dijit
					refObj - the complete $ref object
					promise - promise to resolve with the found dijit
			*/
			dijit: function(factory, name, refObj, promise) {
				dojo.ready(
					function() {
						var resolved = dijit.byId(name);
						if(resolved) {
							promise.resolve(resolved);
						} else {
							promise.unresolved();
						}
					}
				);
			}
		},
		wire$setters: [
			function setDijitProperty(object, property, value) {
				if(typeof object.set == 'function') {
					object.set(property, value);
					return true;
				}

				return false;
			}
		],
		/*
			Function: wire$init
			Initializes the dijit wire plugin

			Parameters:
				options - Plugin options:
					- parse - Boolean, default false.  If set to true (exactly true, not truthy)
					  the dijit plugin will invoke the dojo parse on the page.  Note that the
					  parser will only be invoked once, regardless of how many times this
					  plugin is loaded.
		*/
		wire$init: function onInit(options) {
			// If parse is set to false, don't parse the page
			doParse = options.parse === true;
		},

		/*
			Function: wire$wire
			If parse option was set to true, invokes the dojo parser on the page if it has not
			yet been parsed, and properly destroys (via destroyRecursive() or destroy()) dijits
			that were created via wire context (rather than using dojotype, for example).
			
			Parameters:
				ready - promise that will be resolved when the context has been wired, rejected
					if there is an error during the wiring process, and will receive progress
					events for object creation, property setting, and initialization.
				destroy - promise that will be resolved when the context has been destroyed,
					rejected if there is an error while destroying the context, and will
					receive progress events for objects being destroyed.
		*/
		wire$wire: function onWire(ready, destroy) {
			// Only ever parse the page once, even if other child
			// contexts are created with this plugin present.
			if(doParse && !parsed) {
				parsed = true;
				dojo.ready(function() { parser.parse(); });
			}

			destroy.then(null, null,
				function onObjectDestroyed(progress) {
					if( typeof progress.target.declaredClass == 'string') {
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
		}
	};
});