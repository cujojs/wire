/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * plugins
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 * @author: brian@hovercraftstudios.com
 */
(function(define) {
define(function(require) {

	var when, array, object, priority, nsKey, nsSeparator;

	when = require('when');
	array = require('../array');
	object = require('../object');
	priority = require('./priority');

	nsKey = '$ns';
	nsSeparator = ':';

	function PluginRegistry(parent) {
		this.plugins = [];
		this._namespaces = {};

		this.contextListeners = [];

		this.listeners = array.delegate(parent.listeners);
		this.proxiers =  array.delegate(parent.proxiers);
		this.resolvers = object.inherit(parent.resolvers);
		this.factories = object.inherit(parent.factories);
		this.facets =    object.inherit(parent.facets);
	}

	PluginRegistry.prototype = {
		isPlugin: isPlugin,

		scanModule: function (module, spec, namespace) {
			var self;

			if (allowPlugin(module, this.plugins)) {
				// Add to singleton plugins list to only allow one instance
				// of this plugin in the current context.
				this.plugins.push(module.wire$plugin);

				// Initialize the plugin for this context
				self = this;
				return when(module.wire$plugin(spec),
					function (plugin) {
						plugin && self.registerPlugin(plugin, namespace || getNamespace(spec));
					}
				).yield(module);
			}

			return module;
		},

		registerPlugin: function (plugin, namespace) {
			addNamespace(namespace, this._namespaces);

			addPlugin(plugin.resolvers, this.resolvers, namespace);
			addPlugin(plugin.factories, this.factories, namespace);
			addPlugin(plugin.facets, this.facets, namespace);

			this.listeners.push(plugin);
			if(plugin.context) {
				this.contextListeners.push(plugin.context);
			}

			this._registerProxies(plugin.proxies);
		},

		_registerProxies: function (proxiesToAdd) {
			if (!proxiesToAdd) {
				return;
			}

			this.proxiers = priority.sortReverse(array.union(this.proxiers, proxiesToAdd));
		}
	};

	return PluginRegistry;

	function getNamespace(spec) {
		var namespace;
		if(typeof spec === 'object' && nsKey in spec) {
			// A namespace was provided
			namespace = spec[nsKey];
		}

		return namespace;
	}

	function addNamespace(namespace, namespaces) {
		if(namespace && namespace in namespaces) {
			throw new Error('plugin namespace already in use: ' + namespace);
		} else {
			namespaces[namespace] = 1;
		}
	}

	function allowPlugin(module, existing) {
		return isPlugin(module) && existing.indexOf(module.wire$plugin) === -1;
	}

	function isPlugin(module) {
		return module && typeof module.wire$plugin == 'function'
	}

	function addPlugin(src, registry, namespace) {
		var newPluginName, namespacedName;
		for (newPluginName in src) {
			namespacedName = makeNamespace(newPluginName, namespace);
			if (object.hasOwn(registry, namespacedName)) {
				throw new Error("Two plugins for same type in scope: " + namespacedName);
			}

			registry[namespacedName] = src[newPluginName];
		}
	}

	function makeNamespace(pluginName, namespace) {
		return namespace ? (namespace + nsSeparator + pluginName) : pluginName;
	}
});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
