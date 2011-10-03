/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/**
 * data.js
 * wire plugin that provides a REST resource reference resolver.  Referencing
 * any REST resource using the format: resource!url/goes/here will create a
 * dojo.store.JsonRest pointing to url/goes/here.  Using the id or query
 * options, you can alternatively resolve references to actual data.
 */
define(['when'], function(when) {

    /**
     * Reference resolver for "datastore!url" for easy references to
     * legacy dojo/data datastores.
     * 
     * @param resolver
     * @param name
     * @param refObj
     * @param wire
     */
    function dataStoreResolver(resolver, name, refObj, wire) {
        when.chain(wire({
            create: {
                module: 'dojo/data/ObjectStore',
                args: {
                    objectStore: {
                        create: {
                            module: 'dojo/store/JsonRest',
                            args: { target: name }
                        }
                    }
                }
            }
        }), resolver);
    }

    /**
     * The plugin instance.  Can be the same for all wiring runs
     */
    var plugin = {
        resolvers: {
            datastore: dataStoreResolver
        }
    };

    return {
        wire$plugin: function datastorePlugin(/* ready, destroyed, options */) {
            return plugin;
        }
    };
});