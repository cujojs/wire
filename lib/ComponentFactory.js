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
		this.proxies = [];
	}

	ComponentFactory.prototype = {

		createInstance: function(component) {
			var self, name;

			self = this;
			name = component.id;

			// Look for a factory, then use it to create the object
			return when(this.getFactory(component.spec),
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
			var proxies, lifecycle;

			proxies = this.proxies;
			lifecycle = this.lifecycle;

			return shutdownComponents().then(destroyComponents);

			function shutdownComponents() {
				return when.reduce(proxies,
					function(_, proxy) { return lifecycle.shutdown(proxy); },
					undef);
			}

			function destroyComponents() {
				return when.reduce(proxies,
					function(_, proxy) { return proxy.destroy(); },
					undef);
			}
		},

		proxyInstance: function(instance, component) {
			var proxy;

			if (WireProxy.isProxy(instance)) {
				proxy = instance;
				instance = WireProxy.getTarget(proxy);
			} else {
				proxy = WireProxy.create(instance);
			}

			if(component) {
				proxy.id = component.id;
				proxy.metadata = component;
			}

			return this.initProxy(proxy);
		},

		initProxy: function(proxy) {

			var proxiers = this.plugins.proxiers;

			// Allow proxy plugins to process/modify the proxy
			proxy = proxiers.reduce(
				function(proxy, proxier) {
					var overridden = proxier(proxy);
					return WireProxy.isProxy(overridden) ? overridden : proxy;
				},
				proxy
			);

			this._registerProxy(proxy);

			return proxy;

		},

		_registerProxy: function(proxy) {
			if(proxy.metadata) {
				proxy.path = proxy.metadata.path;
				this.proxies.push(proxy);
			}
		},

		_processLifecycle: function(proxy) {
			var self, lifecycle;

			self = this;
			lifecycle = this.lifecycle;

			return lifecycle.init(proxy).then(function(proxy) {
				return lifecycle.startup(proxy);
			});
		},

		getFactory: function(spec) {
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
