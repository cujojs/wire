/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	Package: store.js
	wire plugin that provides a REST resource reference resolver.  Referencing
	any REST resource using the format: resource!url/goes/here will create a
	dojo.store.JsonRest pointing to url/goes/here.  Using the id or query
	options, you can alternatively resolve references to actual data.
*/

define(['dojo/store/JsonRest'], function(JsonRest) {
	
	function resolveData(dataPromise, refPromise, wait) {
		if(wait === true) {
			dataPromise.then(
				function(data) {
					refPromise.resolve(data);
				},
				function(err) {
					refPromise.unresolved();
				}
			);
		} else {
			refPromise.resolve(dataPromise);
		}
	}

	/*
		Function: resource
		Resolves a dojo.store.JsonRest for the REST resource at the url
		specified in the reference, e.g. resource!url/to/resource
		
		Reference format:
		resource!resource_url
		
		Reference params:
			get - specifies a particular id to fetch.  If supplied, the item will
				be fetched, and the resolved reference will be a *promise* for the data itself,
				rather than the data store.
			query - specifies a query to issue.  If supplied, the query will be
				executed, and the resolved reference will be a *promise* for the query results,
				rather than the data store.
			wait - If specified and the value is strictly true, instead of resolving to
				*promises*, get and query references (see above) will be resolved to their
				actual data by waiting for the get and query operations (which may be
				asynchronous), to complete.  Note that *this will block wiring* (and thus
				the contextReady event) until the actual data has been fetched, or an
				error or timeout occurs.
		
		Parameters:
			name - url
			refObj - complete JSON ref object in the form { $ref: name }
			wire - wiring factory
			promise - <Promise>, provided by wiring factory, that will be resolved
				with the dojo.store.JsonRest that points to the REST
				resource at the referenced url.
	*/
	function resolveResource(promise, name, refObj, wire) {
		var store = new JsonRest({ target: name });
			
		if(refObj.get) {
			// If get was specified, get it, and resolve with the resulting item.
			resolveData(store.get(refObj.get), promise, refObj.wait);

		} else if(refObj.query) {
			// Similarly, query and resolve with the result set.
			resolveData(store.query(refObj.query), promise, refObj.wait);
		
		} else {
			// Neither get nor query was specified, so resolve with
			// the store itself.
			promise.resolve(store);
		}		
	}
	
	return {
		wire$plugin: function restPlugin(ready, options) {
			return {
				resolvers: {
					resource: resolveResource
				}
			};
		}
	};
});