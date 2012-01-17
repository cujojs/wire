/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/sizzle plugin
 * Adds querySelectorAll functionality to wire using John Resig's Sizzle library.
 * Sizzle must be wrapped in an AMD define().  Kris Zyp has a version of this at
 * http://github.com/kriszyp/sizzle
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
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
                    resolver.reject(new Error("Query '" + name + "' returned " + result.length + " items while expecting at least " + (refObj.i + 1)));
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
