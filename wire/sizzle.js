/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/**
 * sizzle.js
 * Adds querySelectorAll functionality to wire using John Resig's Sizzle library.
 * Sizzle must be wrapped in an AMD define().  Kris Zyp has a version of this at
 * http://github.com/kriszyp/sizzle
 *
 * @author John Hann (@unscriptable)
 */
define(['sizzle', 'wire/domReady'], function(sizzle, domReady) {

	function resolveQuery(resolver, name, refObj /*, wire */) {

		domReady(function() {
			var result = sizzle(name);
			resolver.resolve(typeof refObj.i == 'number' && refObj.i < result.length
				? result[refObj.i]
				: result);
		});

	}

    /**
     * The plugin instance.  Can be the same for all wiring runs
     */
    var plugin = {
        resolvers: {
            'dom.query': resolveQuery
        }
    };

	return {
		wire$plugin: function(/*ready, destroyed, options*/) {
            return plugin;
		}
	};

});
