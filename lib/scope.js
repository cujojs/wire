/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author brian@hovercraftstudios.com
 */

(function(define) { 'use strict';
define(function(require) {

	var when, sequence, array, object, async, loader, Lifecycle, Resolver,
		WireProxy, PluginRegistry, defaultPlugins,
		defer, whenAll, scope, undef;

	when = require('when');
	sequence = require('when/sequence');
	array = require('./array');
	object = require('./object');
	async = require('./async');
	loader = require('./loader');
	Lifecycle = require('./lifecycle');
	Resolver = require('./resolver');
	WireProxy = require('./WireProxy');
	PluginRegistry = require('./plugin/registry');
	defaultPlugins = require('./plugin/defaultPlugins');

	defer = when.defer;
	whenAll = when.all;

	function createScope(spec, parent, options) {
		var s = Object.create(scope, options ? createPropertyDescriptors(options) : {});
		return s.init(spec, parent);
	}

	function createPropertyDescriptors(options) {
		return Object.keys(options).reduce(function(descriptor, key) {
			descriptor[key] = { value: options[key] };
			return descriptor;
		}, {});
	}

	scope = {
		contextHandlers: {},

		init: function(spec, parent) {
			var self, ready, contextDestroyed;

			self = this;
			ready = defer();
			contextDestroyed = defer();

			this.parent = parent || {};
			this.ready = ready.promise;
			this.destroyed = contextDestroyed.promise;

			this._inherit(this.parent, ready.promise, contextDestroyed.promise);
			this._initPluginApi();
			this._initDefaultPlugins();
			this._configure();

			this._executeTasks = function(tasks) {
				return sequence(tasks, self);
			};

			this._destroy = function() {
				this._destroy = noop;
				contextDestroyed.resolve();
				return this._destroyComponents();
			};

			return this._executeInitializers()
				.then(prepareScope)
				.then(finalizeScope)
				.yield(ready.promise);

			function prepareScope() {
				self._parseSpec(spec, ready.resolver);
				self._createComponents(spec);
			}

			function finalizeScope() {
				self._ensureAllModulesLoaded();
			}
		},

		destroy: function() {
			return this._destroy();
		},

		getModule: function(moduleId, spec) {
			var self, module;

			self = this;
			module = defer();

			scanPluginWhenLoaded(typeof moduleId == 'string'
				? this.moduleLoader(moduleId)
				: moduleId, module.resolver);

			return module.promise;

			function scanPluginWhenLoaded(loadModulePromise, moduleReadyResolver) {

				var loadPromise = when(loadModulePromise, function (module) {
					return when(self._scanPlugin(module, spec), function() {
						moduleReadyResolver.resolve(self.modulesReady.promise.yield(module));
					});
				}, moduleReadyResolver.reject);

				self.modulesToLoad && self.modulesToLoad.push(loadPromise);

			}
		},

		getProxy: function(nameOrComponent, onBehalfOf) {
			var self = this;
			return typeof nameOrComponent == 'string'
				? when(this._resolveRefName(nameOrComponent, {}, onBehalfOf), function (component) {
					return self._proxyComponent(component);
				})
				: self._proxyComponent(nameOrComponent);
		},

		_inherit: function(parent, ready, destroyed) {
			var self = this;

			// Descend scope and plugins from parent so that this scope can
			// use them directly via the prototype chain

			this._api = {
				createChild: wireChild.bind(this),
				destroy: this.destroy.bind(this),
				resolve: function(ref, onBehalfOf) {
					return when.resolve(self._resolveRef(ref, onBehalfOf));
				}
			};

			WireContext.prototype =
				this._createWireApi(this._api, object.inherit(parent.instances));
			this.instances = new WireContext();
			WireContext.prototype = undef;

			this.components = object.inherit(parent.components);

			this.path = this._createPath(this.name, parent.path);
			this.plugins = new PluginRegistry(parent.plugins||{}, ready, destroyed);

			this.contextHandlers.init = array.delegate(this.contextHandlers.init);
			this.contextHandlers.destroy = array.delegate(this.contextHandlers.destroy);

			this.proxiedComponents = [];

			// These should not be public
			this.modulesToLoad = [];
			this.modulesReady = defer();
			this.moduleLoader = loader(parent, this).load;

			// TODO: Fix this
			// When the parent begins its destroy phase, this child must
			// begin its destroy phase and complete it before the parent.
			// The context hierarchy will be destroyed from child to parent.
			if (parent.destroyed) {
				when(parent.destroyed, this.destroy.bind(this));
			}

			function wireChild(spec, options) {
				return self.createContext(spec, {
					moduleLoader: self.moduleLoader,
					instances: self.instances,
					components: self.components,
					destroyed: destroyed
				}, options);
			}
		},

		_initPluginApi: function() {
			// Plugin API
			// wire() API that is passed to plugins.
			var self, api, pluginApi;

			self = this;
			api = this._api;

			pluginApi = this._pluginApi = {};

			pluginApi.contextualize = function(name) {
				function contextualApi(spec, name, path) {
					return self._resolveItem(spec, { id: self._createPath(name, path) });
				}

				contextualApi.createChild = api.createChild;

				contextualApi.resolveRef = function(ref) {
					var onBehalfOf = arguments.length > 1 ? arguments[2] : name;
					return api.resolve(ref, onBehalfOf);
				};

				contextualApi.getProxy = function(nameOrComponent) {
					var onBehalfOf = arguments.length > 1 ? arguments[2] : name;
					return self.getProxy(nameOrComponent, onBehalfOf);
				};

				contextualApi.resolver = pluginApi.resolver;

				return contextualApi;
			};
		},

		_initDefaultPlugins: function() {
			var self = this;

			defaultPlugins.forEach(this._scanPlugin, this);

			// Add a contextualized module factory
			this.plugins.registerPlugin({ factories: {
				module: function(resolver, componentDef) {
					resolver.resolve(self.getModule(componentDef.options, componentDef.spec));
				}
			}});
		},

		_createWireApi: function(api, context) {
			var wireApi = context.wire = function() {
				return api.createChild.apply(undef, arguments);
			};
			wireApi.destroy = context.destroy = api.destroy;

			// Consider deprecating resolve
			// Any reference you could resolve using this should simply
			// be injected instead.
			wireApi.resolve = context.resolve = api.resolve;

			return context;
		},

		_configure: function() {
			var config = {
				pluginApi: this._pluginApi,
				plugins: this.plugins
			};

			this.lifecycle = new Lifecycle(config);
			this.resolver = this._pluginApi.resolver = new Resolver(config);
		},

		_executeInitializers: function() {
			return this._executeTasks(this.contextHandlers.init);
		},

		_parseSpec: function(spec, scopeResolver) {
			var promises, instances, components, name, d;

			instances = this.instances;
			components = this.components;
			promises = [];

			// Setup a promise for each item in this scope
			for (name in spec) {
				// An initializer may have inserted concrete components
				// into the context.  If so, they override components of the
				// same name from the input spec
				if(!object.hasOwn(instances, name)) {
					d = defer();

					components[name] = {
						id: name,
						spec: spec[name],
						promise: d.promise,
						resolver: d.resolver
					};

					promises.push(instances[name] = d.promise);
				}
			}

			// When all scope item promises are resolved, the scope
			// is ready. When this scope is ready, resolve the promise
			// with the objects that were created
			scopeResolver.resolve(whenAll(promises).yield(this));
		},

		_createComponents: function(spec) {
			// Process/create each item in scope and resolve its
			// promise when completed.
			var components = this.components;
			Object.keys(components).forEach(function(name) {
				this._createScopeItem(spec[name], components[name]);
			}.bind(this));
		},

		_createScopeItem: function(spec, component) {
			// NOTE: Order is important here.
			// The object & local property assignment MUST happen before
			// the chain resolves so that the concrete item is in place.
			// Otherwise, the whole scope can be marked as resolved before
			// the final item has been resolved.
			var item, itemResolver, self;

			self = this;
			item = this._resolveItem(spec, component);
			itemResolver = component.resolver;

			when(item, function (resolved) {
				self._makeResolvable(component, resolved);
				itemResolver.resolve(resolved);
			}, itemResolver.reject);
		},

		_makeResolvable: function(component, instance) {
			var id = component.id;
			if(id != null) {
				this.instances[id] = WireProxy.getTarget(async.getValue(instance));
			}
		},

		_resolveItem: function(spec, component) {
			var item;

			if (this.resolver.isRef(spec)) {
				// Reference
				item = this._resolveRef(spec, component.id);
			} else {
				// Component
				item = this._createItem(spec, component);
			}

			return item;
		},

		_createItem: function(spec, component) {
			var created;

			if (Array.isArray(spec)) {
				// Array
				created = this._createArray(spec, component);

			} else if (object.isObject(spec)) {
				// component spec, create the component
				created = this._createComponent(spec, component);

			} else {
				// Plain value
				created = when.resolve(spec);
			}

			return created;
		},

		_createArray: function(arrayDef, arrayComponent) {
			var self = this;
			// Minor optimization, if it's an empty array spec, just return an empty array.
			return arrayDef.length
				? when.map(arrayDef, function(item) {
					return self._resolveItem(item, { id: arrayComponent.id + '[]' });
				})
				: [];
		},

		_createComponent: function(spec, component) {

			var self, name;

			self = this;
			name = component.id;

			// Look for a factory, then use it to create the object
			return when(this._findFactory(spec),
				function (found) {
					var instance, factory, options;

					instance = defer();
					factory = found.factory;
					options = found.options;

					factory(instance.resolver, options,
						self._pluginApi.contextualize(name));

					return instance.promise.then(function(created) {
						return self._proxyComponent(created, component);
					})
					.then(function(proxy) {
						var created = proxy.target;

						return self.plugins.isPlugin(created)
							? proxy : self._processComponent(proxy);

					})
					.then(WireProxy.getTarget);
				},
				function () {
					// No factory found, treat object spec as a nested scope
					return createScope(spec, self).then(function(childScope) {
						// TODO: find a lighter weight solution
						// We are effectively paying the cost of creating a complete scope,
						// and then discarding everything except the component map.
						return object.mixin({}, childScope.instances);
					});
				}
			);
		},

		_proxyComponent: function(instance, component) {
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

			return this.modulesReady.promise.then(function() {

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
				proxy.path = component.path = this._createPath(component.id);
				this.proxiedComponents.push(proxy);
			}
		},

		_processComponent: function(proxy) {
			var self = this;

			return when(proxy.init(), function(proxy) {
				// Components become resolvable after the initialization phase
				// This allows circular references to be resolved after init
				self._makeResolvable(proxy.metadata, proxy);
				return proxy.startup();
			});
		},

		_findFactory: function(spec) {

			var plugins, found;

			plugins = this.plugins;

			found = getFactory(plugins, spec);
			if(!found) {
				found = when(this.modulesReady.promise, function () {
					return getFactory(plugins, spec) || when.reject();
				});
			}

			return found;
		},

		_ensureAllModulesLoaded: function() {
			var self = this;
			this.modulesReady.resolve(async.until(waitForModules, 0, allModulesLoaded));

			function waitForModules() {
				var modulesToLoad = self.modulesToLoad;
				self.modulesToLoad = [];

				return whenAll(modulesToLoad);
			}

			function allModulesLoaded() {
				return self.modulesToLoad.length === 0;
			}
		},

		_scanPlugin: function(module, spec) {
			var component;
			if(spec && spec.id) {
				component = this.components[spec.id];
				if(component) {
					component.isPlugin = this.plugins.isPlugin(module);
				}
			}
			return this.plugins.scanModule(module, spec);
		},

		_destroy: noop,

		_destroyComponents: function() {
			var lifecycle, self;

			self = this;
			lifecycle = this.lifecycle;

			return shutdownComponents(this.proxiedComponents)
				.then(destroyComponents)
				.then(releaseResources)
				.then(this._executeDestroyers.bind(this));

			function shutdownComponents(proxiedComponents) {
				return when.reduce(proxiedComponents,
					function(_, proxied) { return proxied.shutdown(); },
					undef);
			}

			function destroyComponents() {
				var instances, p;

				instances = self.instances;

				for (p in  instances) {
					delete instances[p];
				}

				return when.reduce(self.proxiedComponents,
					function(_, proxied) { return proxied.destroy(); },
					undef);
			}

			function releaseResources() {
				// Free Objects
				self.instances = self.parent = self.wireApi
					= self.proxiedComponents = self._pluginApi = self.plugins
					= undef;
			}
		},

		_executeDestroyers: function() {
			return this._executeTasks(this.contextHandlers.destroy);
		},

		_resolveRef: function(ref, onBehalfOf) {
			var scope;

			ref = this.resolver.parse(ref);
			scope = onBehalfOf == ref.name && this.parent.instances ? this.parent : this;

			return this._doResolveRef(ref, scope.instances, onBehalfOf);
		},

		_resolveRefName: function(refName, options, onBehalfOf) {
			var ref = this.resolver.create(refName, options);

			return this._doResolveRef(ref, this.instances, onBehalfOf);
		},

		_doResolveRef: function(ref, scope, onBehalfOf) {
			return when(this.modulesReady.promise, resolveRef);

			function resolveRef() {
				return ref.resolve(function(name) {
					return resolveDeepName(name, scope);
				}, onBehalfOf);
			}
		},

		_createPath: function(name, basePath) {
			var path = basePath || this.path;
			return (path && name) ? (path + '.' + name) : name;
		}
	};

	return createScope;

	function resolveDeepName(name, scope) {
		var parts = name.split('.');

		if(parts.length > 2) {
			return when.reject('Only 1 "." is allowed in refs: ' + name);
		}

		return when.reduce(parts, function(scope, segment) {
			return segment in scope
				? scope[segment]
				: when.reject('Cannot resolve ref: ' + name);
		}, scope);
	}

	function getFactory(plugins, spec) {
		var f, factories, found;

		factories = plugins.factories;

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

	function noop() {}

	function WireContext() {}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(require); }
);