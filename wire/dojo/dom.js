/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: dom.js
	Describe your wire plugin here
*/
define(['dojo', 'wire/domReady'], function(dojo, domReady) {

	function resolveQuery(promise, name, refObj, wire) {
		// Could use dojo.ready() here, but it also waits for the dijit
		// parser, which may not be necessary in all situations, e.g. if
		// you're using dojo, but not dijit.  So, just use domReady.
		domReady(function() {
			var result = dojo.query(name);
			promise.resolve(typeof refObj.i == 'number' && refObj.i < result.length
				? result[refObj.i]
				: result);
		});		
	}

	function unloadAspect(promise, facet, wire) {
		var spec, unload, tunload, target;

		spec = facet.options;
		unload = spec.unload;
		tunload = typeof unload;
		target = facet.target;
	
		// If it's an object, there may be more than one unload func to
		// call, and each may have args.
		// If it's just a string, then it's the name of a function to
		// call on unload.
		if(tunload == 'object') {
			dojo.addOnUnload(function() {
				for(var f in unload) {
					facet.invoke(target[f], unload[f]);
				}
			});
			
		} else if(tunload == 'string') {
			dojo.addOnUnload(function() {
				facet.invoke(target[unload]);
			});
		}
	}
	
	return {
		wire$plugin: function(ready, destroyed, options) {
			return {
				resolvers: {
					'dom.query': resolveQuery
				},
				// facets: {
				// 	unload: {
				// 		initialized: unloadAspect
				// 	}
				// }
			};
		}
	};

});