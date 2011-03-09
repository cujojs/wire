/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	Package: dom.js
	Plugin that adds dom query resolver and unload handler capabilities.
	IMPORTANT: Use the unload capability carefully, as once an unload function
	has been registered, it cannot be removed, even when the context is destroyed!
*/
define(['dojo'], function(dojo) {
	
	return {
		wire$resolvers: {
			/*
				Function: dom.query
				Reference resolver that resolves a CSS style DOM query to either an array
				of nodes, or a single node.

				Reference format:
				dom.query!<css query>
				e.g. "dom.query!.foo .bar"
			*/
			'dom.query': function(factory, name, refObj, promise) {
				factory.domReady.then(function() {
					var result = dojo.query(name);
					promise.resolve(typeof refObj.i == 'number' && refObj.i < result.length
						? result[refObj.i]
						: result);
				});
			}
		},
		/*
			Function: wire$wire
			Invoked when wiring starts and provides two promises: one for wiring the context,
			and one for destroying the context.  Plugins should register resolve, reject, and
			promise handlers as necessary to do their work.
			
			Parameters:
				ready - promise that will be resolved when the context has been wired, rejected
					if there is an error during the wiring process, and will receive progress
					events for object creation, property setting, and initialization.
				destroy - promise that will be resolved when the context has been destroyed,
					rejected if there is an error while destroying the context, and will
					receive progress events for objects being destroyed.
		*/
		wire$wire: function(ready, destroy) {

			ready.then(null, null,
				function onObject(progress) {
					// Look for an unload spec, and if one is present, setup an
					// unload handler
					if(progress.status === 'init') {
						var spec = progress.spec,
							unload = spec.unload,
							tunload = typeof unload,
							target = progress.target,
							factory = progress.factory;
					
						// If it's an object, there may be more than one unload func to
						// call, and each may have args.
						// If it's just a string, then it's the name of a function to
						// call on unload.
						if(tunload == 'object') {
							dojo.addOnUnload(function() {
								for(var f in unload) {
									factory.invoke(target, target[f], unload[f]);
								}
							});
							
						} else if(tunload == 'string') {
							dojo.addOnUnload(function() {
								factory.invoke(target, target[unload]);
							});
						}
					}
				}
			);
		}
	};
});