/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function(require) {

	var when, object, WireProxy, defer, undef;

	when = require('when');
	object = require('./object');
	WireProxy = require('./WireProxy');

	defer = when.defer;

	function ComponentFactory(lifecycle, config) {
		object.mixin(this, config);
		this.lifecycle = lifecycle;
		this.proxiedComponents = [];
	}

	ComponentFactory.prototype = {

		createInstance: function(component) {
			var self, name;

			self = this;
			name = component.id;

			// Look for a factory, then use it to create the object
			return when(this._getFactory(component.spec),
				function (found) {
					var instance, factory, options;

					instance = defer();
					factory = found.factory;
					options = found.options;

					factory(instance.resolver, options,
						self.pluginApi.contextualize(name));

					return instance.promise.then(function(instance) {
						return self.addInstance(instance, component);
					});
				},
				function() {
					return when.reject(component);
				}
			);
		},

		addInstance: function(instance, component) {
			var self = this;

			return this.proxyInstance(instance, component)
				.then(function(proxy) {
					return self.plugins.isPlugin(proxy.target)
						? proxy : self._processLifecycle(proxy);
				})
				.then(WireProxy.getTarget);
		},

		destroy: function() {
			var proxiedComponents = this.proxiedComponents;

			return shutdownComponents().then(destroyComponents);

			function shutdownComponents() {
				return when.reduce(proxiedComponents,
					function(_, proxied) { return proxied.shutdown(); },
					undef);
			}

			function destroyComponents() {
				return when.reduce(proxiedComponents,
					function(_, proxied) { return proxied.destroy(); },
					undef);
			}
		},

		proxyInstance: function(instance, component) {
			var proxy, proxiers, self;

			if (WireProxy.isProxy(instance)) {
				proxy = instance;
				instance = WireProxy.getTarget(proxy);
			} else {
				proxy = WireProxy.create(instance);
			}

			proxy = WireProxy.init(proxy, this.lifecycle, component);

			self = this;
			proxiers = this.plugins.proxiers;

			return this.modulesReady.then(function() {

				// Allow proxy plugins to process/modify the proxy
				proxy = proxiers.reduce(
					function(proxy, proxier) {
						var overridden = proxier(proxy);
						return WireProxy.isProxy(overridden) ? overridden : proxy;
					},
					proxy
				);

				self._registerProxy(proxy, component);

				return proxy;
			});
		},

		_registerProxy: function(proxy, component) {
			if(component) {
				proxy.path = component.path;
				this.proxiedComponents.push(proxy);
			}
		},

		_processLifecycle: function(proxy) {
			return when(proxy.init(), function(proxy) {
				return proxy.startup();
			});
		},

		_getFactory: function(spec) {
			var plugins, found, self;

			self = this;
			plugins = this.plugins;
			found = this._findFactory(spec);

			if(!found) {
				found = when(this.modulesReady, function () {
					return self._findFactory(spec) || when.reject();
				});
			}

			return found;
		},

		_findFactory: function(spec) {
			var f, factories, found;

			factories = this.plugins.factories;

			for (f in factories) {
				if (object.hasOwn(spec, f)) {
					found = {
						factory: factories[f],
						options: {
							options: spec[f],
							spec: spec
						}
					};
					break;
				}
			}

			// Intentionally returns undefined if no factory found
			return found;

		}
	};

	return ComponentFactory;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
