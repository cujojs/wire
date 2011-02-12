/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */
define(['dojo/store/JsonRest'], function(JsonRest) {
	return {
		wire$resolvers: {
			resource: function(factory, name, refObj, promise) {
				promise.resolve(new JsonRest({ target: name }));
			}
		}
	};
});