/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function(require) {

	var when, advice, object, WireContext, Scope,
		PluginRegistry, defaultPlugins,
		DirectedGraph, trackInflightRefs, slice, scopeProto, undef;

	when = require('when');
	advice = require('./advice');
	object = require('./object');
	WireContext = require('./WireContext');
	Scope = require('./scope');
	PluginRegistry = require('./plugin/registry');
	defaultPlugins = require('./plugin/defaultPlugins');
	DirectedGraph = require('./graph/DirectedGraph');
	trackInflightRefs = require('./graph/trackInflightRefs');
	slice = Array.prototype.slice;

	scopeProto = Scope.prototype;

	function Container() {
		Scope.apply(this, arguments);
	}

	/**
	 * Container inherits from Scope, adding plugin support and
	 * context level events.
	 */
	Container.prototype = object.extend(scopeProto, {
		_inheritInstances: function(parent) {
			var publicApi = {
				wire: this._createChild.bind(this),
				destroy: this.destroy.bind(this),
				resolve: this._resolveRef.bind(this)
			};

			return WireContext.inherit(parent.instances, publicApi);
		},

		_init: advice.after(
			scopeProto._init,
			function() {
				this.plugins = new PluginRegistry();
				return this._installDefaultPlugins();
			}
		),

		_startup: advice.after(
			scopeProto._startup,
			function(started) {
				var self = this;
				return when(started).otherwise(function(e) {
					return self._contextEvent('error', e).yield(started);
				});
			}
		),

		_installDefaultPlugins: function() {
			return this._installPlugins(defaultPlugins);
		},

		_installPlugins: function(plugins) {
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
		},

		_createResolver: advice.after(
			scopeProto._createResolver,
			function(resolver) {
				return trackInflightRefs(
					new DirectedGraph(), resolver, this.refCycleTimeout);
			}
		),

		_contextEvent: function (type, data) {
			var api, listeners;

			if(!this.contextEventApi) {
				this.contextEventApi = this._pluginApi.contextualize(this.path);
			}

			api = this.contextEventApi;
			listeners = this.plugins.contextListeners;

			return when.reduce(listeners, function(undef, listener) {
				var d;

				if(listener[type]) {
					d = when.defer();
					listener[type](d.resolver, api, data);
					return d.promise;
				}

				return undef;
			}, undef);
		},

		_createComponents: advice.beforeAsync(
			scopeProto._createComponents,
			function(parsed) {
				var self = this;
				return this._installPlugins(parsed.plugins)
					.then(function() {
						return self._contextEvent('initialize');
					});
			}
		),

		_awaitInstances: advice.afterAsync(
			scopeProto._awaitInstances,
			function() {
				return this._contextEvent('ready');
			}
		),

		_destroyComponents: advice.beforeAsync(
			scopeProto._destroyComponents,
			function() {
				return this._contextEvent('shutdown');
			}
		),

		_releaseResources: advice.beforeAsync(
			scopeProto._releaseResources,
			function() {
				return this._contextEvent('destroy');
			}
		)
	});

	return Container;

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
