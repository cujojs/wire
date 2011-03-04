/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: store.js
	wire plugin that provides a REST resource reference resolver.  Referencing
	any REST resource using the format: resource!url/goes/here will create a
	dojo.store.JsonRest pointing to url/goes/here
*/

define(['dojo/store/JsonRest'], function(JsonRest) {
	return {
		wire$resolvers: {
			/*
				Function: resource
				Resolves a dojo.store.JsonRest for the REST resource at the url
				specified in the reference, e.g. resource!url/to/resource
				
				Reference format:
				resource!resource_url
				
				Reference params:
					get - specifies a particular id to fetch.  If supplied, the item will
						be fetched, and the resolved reference will be the data item itself,
						rather than the data store.
					query - specifies a query to issue.  If supplied, the query will be
						executed, and the resolved reference will be the query results,
						rather than the data store.
				
				Parameters:
					factory - wiring factory
					name - url
					refObj - complete JSON ref object in the form { $ref: name }
					promise - <Promise>, provided by wiring factory, that will be resolved
						with the dojo.store.JsonRest that points to the REST
						resource at the referenced url.
			*/
			resource: function(factory, name, refObj, promise) {
				
				var store = new JsonRest({ target: name }),
					unresolved = function(err) {
						promise.unresolved();
					},
					storePromise;
				
				if(refObj.get) {
					// If get was specified, get it, and resolve with the resulting item.
					storePromise = store.get(refObj.get);

				} else if(refObj.query) {
					// Similarly, query and resolve with the result set.
					storePromise = store.query(refObj.query);
				
				}
				
				if(storePromise) {
					if(refObj.wait === true) {
						storePromise.then(
							function(data) {
								promise.resolve(data);
							},
							unresolved
						);
						
					} else {
						promise.resolve(storePromise);
					}
				} else {
					// Neither get nor query was specified, so resolve with
					// the store itself.
					promise.resolve(store);
				}
			}
		}
	};
});