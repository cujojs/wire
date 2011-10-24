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
            if (typeof refObj.i == 'number') {
                if (refObj.i < result.length) {
                    resolver.resolve(result[refObj.i]);
                } else {
                  var error = new Error("Query '" + name + "' returned " + result.length + " items while expecting at least " + (refObj.i + 1));
                  resolver.reject(error);
                  throw error;
                }
            } else {
                resolver.resolve(result)
            }
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
