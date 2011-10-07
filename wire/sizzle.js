/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: sizzle.js
	Adds querySelectorAll functionality to wire using John Resig's Sizzle library.
	Sizzle must be wrapped in an AMD define().  Kris Zyp has a version of this at
	http://github.com/kriszyp/sizzle
	
	Author: John Hann (@unscriptable)
*/
define(['sizzle', 'wire/domReady'], function(sizzle, domReady) {

	function resolveQuery(promise, name, refObj /*, wire */) {

		domReady(function() {
			var result = sizzle(name);
			if (typeof refObj.i == 'number') {
			  if (refObj.i < result.length) {
          promise.resolve(result[refObj.i]);
        } else {
          promise.reject("Query '" + name + "' returned " + result.length + " items while expecting at least " + (refObj.i + 1));
        }
			} else {
        promise.resolve(result)
			}
		});

	}

	return {
		wire$plugin: function(/*ready, destroyed, options*/) {
			return {
				resolvers: {
					'dom.query': resolveQuery
				}
			};
		}
	};

});
