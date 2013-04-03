/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
	define(function(require) {

		var when, WireContext, Scope, PluginRegistry, defaultPlugins,
			Resolver, DirectedGraph, trackInflightRefs;

		when = require('when');
		WireContext = require('./WireContext');
		Scope = require('./scope');
		PluginRegistry = require('./plugin/registry');
		defaultPlugins = require('./plugin/defaultPlugins');
		Resolver = require('./resolver');
		DirectedGraph = require('./graph/DirectedGraph');
		trackInflightRefs = require('./graph/trackInflightRefs');

		function Container() {
			Scope.apply(this, arguments);
		}

		/**
		 * Container inherits from Scope
		 */
		Container.prototype = Object.create(Scope.prototype);

		Container.prototype._inheritInstances = function(parent) {
			var publicApi = {
				wire: this._createChild.bind(this),
				destroy: this.destroy.bind(this),
				resolve: this._resolveRef.bind(this)
			};

			return WireContext.inherit(parent.instances, publicApi);
		};

		Container.prototype._initPluginRegistry = function() {
			// A Container will never inherit plugins, so create PluginRegistry
			// without inheriting
			return new PluginRegistry();
		};

		Container.prototype._installDefaultPlugins = function() {
			var self = this;
			// Add a contextualized module factory for this Container
			this.plugins.registerPlugin({ factories: {
				module: function(resolver, componentDef) {
					resolver.resolve(self.getModule(componentDef.options));
				}
			}});

			return this._installPlugins(defaultPlugins);
		};

		Container.prototype._installPlugins = function(plugins) {
			if(!plugins) {
				return when.resolve();
			}

			var self, registry, installed;

			self = this;
			registry = this.plugins;

			if(Array.isArray(plugins)) {
				installed = plugins.map(function(plugin) {
					return installPlugin(plugin);
				});
			} else {
				installed = Object.keys(plugins).map(function(namespace) {
					return installPlugin(plugins[namespace], namespace);
				});
			}

			return when.all(installed);

			function installPlugin(pluginSpec, namespace) {
				var module, t;

				t = typeof pluginSpec;
				if(t == 'string') {
					module = pluginSpec;
					pluginSpec = {};
				} else if(typeof pluginSpec.module == 'string') {
					module = pluginSpec.module;
				} else {
					module = pluginSpec;
				}

				return self.getModule(module).then(function(plugin) {
					return registry.scanModule(plugin, pluginSpec, namespace);
				});
			}
		};

		Container.prototype._createResolver = function(plugins, pluginApi) {
			var resolver = new Resolver(plugins.resolvers, pluginApi);
			return trackInflightRefs(
				new DirectedGraph(), resolver, this.refCycleTimeout);
		};

		return Container;
	});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
