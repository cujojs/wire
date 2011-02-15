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
				
				Parameters:
					factory - wiring factory
					name - url
					refObj - complete JSON ref object in the form { $ref: name }
					promise - <Promise>, provided by wiring factory, that will be resolved
						with the dojo.store.JsonRest that points to the REST
						resource at the referenced url.
			*/
			resource: function(factory, name, refObj, promise) {
				promise.resolve(new JsonRest({ target: name }));
			}
		}
	};
});