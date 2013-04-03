/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function(require) {

	var when, loader, Scope, PluginRegistry, defaultPlugins,
		Resolver, DirectedGraph, trackInflightRefs, init;

	Resolver = require('./resolver');
	DirectedGraph = require('./graph/DirectedGraph');
	trackInflightRefs = require('./graph/trackInflightRefs');

	when = require('when');
	loader = require('./loader');
	Scope = require('./scope');
	PluginRegistry = require('./plugin/registry');
	defaultPlugins = require('./plugin/defaultPlugins');

	/**
	 * Creates a new context from the supplied specs, with the supplied parent context.
	 * If specs is an {Array}, it may be a mixed array of string module ids, and object
	 * literal specs.  All spec module ids will be loaded, and then all specs will be
	 * merged from left-to-right (rightmost wins), and the resulting, merged spec will
	 * be wired.
	 * @private
	 *
	 * @param {String|Object|String[]|Object[]} specs
	 * @param {Object} parent context
	 * @param {Object} [options]
	 *
	 * @return {Promise} a promise for the new context
	 */
	function createContext(specs, parent, options) {
		// Do the actual wiring after all specs have been loaded

		if(!options) { options = {}; }
		if(!parent)  { parent  = {}; }

		options.createContext = createContext;

		var moduleLoader = loader(options.require, parent.moduleLoader);

		return moduleLoader.merge(specs).then(function(spec) {
			return new Context(parent, options).init(spec);
		});
	}

	function Context() {
		Scope.apply(this, arguments);
	}

	/**
	 * Context inherits from Scope
	 */
	Context.prototype = Object.create(Scope.prototype);

	init = Scope.prototype.init;
	Context.prototype.init = function(spec, parent) {
		// Ensure we only expose the component instances and controlled API
		return init.apply(this, arguments).then(function(self) {
			return self.instances;
		});
	};

	Context.prototype._initPluginRegistry = function() {
		// A Context will never inherit plugins, so create PluginRegistry
		// without inheriting
		return new PluginRegistry();
	};

	Context.prototype._installDefaultPlugins = function() {
		var self = this;
		// Add a contextualized module factory for this Context
		this.plugins.registerPlugin({ factories: {
			module: function(resolver, componentDef) {
				resolver.resolve(self.getModule(componentDef.options));
			}
		}});

		return this._installPlugins(defaultPlugins);
	};

	Context.prototype._installPlugins = function(plugins) {
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

	Context.prototype._createResolver = function(plugins, pluginApi) {
		var resolver = new Resolver(plugins.resolvers, pluginApi);
		return trackInflightRefs(
			new DirectedGraph(), resolver, this.refCycleTimeout);
	};

	return createContext;

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
