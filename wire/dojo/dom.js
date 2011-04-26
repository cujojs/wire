/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: dom.js
	Describe your wire plugin here
*/
define(['dojo'], function(dojo) {

	function resolveQuery(promise, name, refObj, wire) {
		require(['domReady'], function() {
			var result = dojo.query(name);
			promise.resolve(typeof refObj.i == 'number' && refObj.i < result.length
				? result[refObj.i]
				: result);
		});		
	}

	function unloadAspect(promise, aspect, wire) {
		var spec, unload, tunload, target;

		spec = aspect.options;
		unload = spec.unload;
		tunload = typeof unload;
		target = aspect.target;
	
		// If it's an object, there may be more than one unload func to
		// call, and each may have args.
		// If it's just a string, then it's the name of a function to
		// call on unload.
		if(tunload == 'object') {
			dojo.addOnUnload(function() {
				for(var f in unload) {
					aspect.invoke(target[f], unload[f]);
				}
			});
			
		} else if(tunload == 'string') {
			dojo.addOnUnload(function() {
				aspect.invoke(target[unload]);
			});
		}
	}
	
	return {
		wire$plugin: function(ready, destroyed, options) {
			return {
				resolvers: {
					'dom.query': resolveQuery
				},
				// aspects: {
				// 	unload: {
				// 		initialized: unloadAspect
				// 	}
				// }
			};
		}
	};

});