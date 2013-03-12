/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author brian@hovercraftstudios.com
 */

(function(define) { 'use strict';
define(function(require) {

	var when, sequence, array, object, async, loader,
		ComponentFactory, Lifecycle, Resolver,
		WireProxy, PluginRegistry, defaultPlugins,
		defer, whenAll, undef;

	when = require('when');
	sequence = require('when/sequence');
	array = require('./array');
	object = require('./object');
	async = require('./async');
	loader = require('./loader');
	ComponentFactory = require('./ComponentFactory');
	Lifecycle = require('./lifecycle');
	Resolver = require('./resolver');
	WireProxy = require('./WireProxy');
	PluginRegistry = require('./plugin/registry');
	defaultPlugins = require('./plugin/defaultPlugins');

	defer = when.defer;
	whenAll = when.all;

	function createScope(spec, parent, options) {
		return new WireScope(options).init(spec, parent);
	}

	function WireScope(options) {
		object.mixin(this, options);
	}

	WireScope.prototype = {
		contextHandlers: {},

		init: function(spec, parent) {
			var self, ready, destroyed, contextEventApi;

			self = this;
			ready = defer();
			destroyed = defer();

			this.parent = parent || {};
			this.ready = ready.promise;
			this.destroyed = destroyed.promise;

			this._inherit(this.parent, destroyed.promise);
			this._initPluginApi();
			this._initDefaultPlugins();
			this._configure();

			this._executeTasks = function(tasks) {
				return sequence(tasks, self);
			};

			this._destroy = function() {
				this._destroy = noop;

				var shutdown = contextEvent('shutdown');

				destroyed.resolve();

				return shutdown()
					.then(this._destroyComponents.bind(this))
					.then(contextEvent('destroy'))
					.then(this._releaseResources.bind(this));
			};

			contextEventApi = self._pluginApi.contextualize(self.path);

			this.modulesReady.promise.then(contextEvent('initialize'));

			return this._executeInitializers()
				.then(prepareScope)
				.then(finalizeScope)
				.yield(ready.promise);

			function prepareScope() {
				var componentsCreated = self._parseSpec(spec).then(contextEvent('ready'));
				ready.resolve(componentsCreated.yield(self));
				self._createComponents();
			}

			function finalizeScope() {
				self._ensureAllModulesLoaded();
			}

			function contextEvent(type) {
				return function() {
					var listeners = self.plugins.contextListeners;
					return when.reduce(listeners, function(_, listener) {
						var d;

						if(listener[type]) {
							d = defer();
							listener[type](d.resolver, contextEventApi);
							return d.promise.yield(undef);
						}
					}, undef);
				}
			}
		},

		_releaseResources: function() {
			// Free Objects
			this.instances = this.components = this.parent = this._api
				= this.lifecycle = this.resolver = this.componentFactory
				= this._pluginApi = this.plugins
				= undef;
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
			var componentFactory = this.componentFactory;
			return typeof nameOrComponent == 'string'
				? when(this._resolveRefName(nameOrComponent, {}, onBehalfOf), function (component) {
					return componentFactory.proxyInstance(component);
				})
				: componentFactory.proxyInstance(nameOrComponent);
		},

		_inherit: function(parent, destroyed) {
			var self = this;

			// Descend scope and plugins from parent so that this scope can
			// use them directly via the prototype chain

			this._api = {
				createChild: wireChild.bind(this),
				destroy: this.destroy.bind(this),
				resolve: function(ref, onBehalfOf) {
					return self._resolveRef(ref, onBehalfOf);
				}
			};

			WireContext.prototype =
				this._createWireApi(this._api, object.inherit(parent.instances));
			this.instances = new WireContext();
			WireContext.prototype = undef;

			this.components = object.inherit(parent.components);

			this.path = this._createPath(this.name, parent.path);
			this.plugins = new PluginRegistry(parent.plugins||{});

			this.contextHandlers.init = array.delegate(this.contextHandlers.init);
			this.contextHandlers.destroy = array.delegate(this.contextHandlers.destroy);

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
				function contextualApi(spec, id) {
					var componentDef = self._createComponentDef(id, spec);
					return self._resolveItem(componentDef);
				}

				contextualApi.addInstance = function(instance, id) {
					var componentDef = self._createComponentDef(id);
					return self.componentFactory.addInstance(instance, componentDef);
				};

				contextualApi.resolveRef = function(ref) {
					var onBehalfOf = arguments.length > 1 ? arguments[2] : name;
					return api.resolve(ref, onBehalfOf);
				};

				contextualApi.getProxy = function(nameOrComponent) {
					var onBehalfOf = arguments.length > 1 ? arguments[2] : name;
					return self.getProxy(nameOrComponent, onBehalfOf);
				};

				contextualApi.createChild = api.createChild;

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
			var config, self;

			self = this;
			config = {
				pluginApi: this._pluginApi,
				plugins: this.plugins,
				modulesReady: this.modulesReady.promise
			};

			this.lifecycle = new Lifecycle(config);
			this.resolver = this._pluginApi.resolver = new Resolver(config);
			this.componentFactory = new ComponentFactory(this.lifecycle, config);
			this.componentFactory.afterInit = function(proxy) {
				self._makeResolvable(proxy.metadata, proxy);
			};
		},

		_executeInitializers: function() {
			return this._executeTasks(this.contextHandlers.init);
		},

		_parseSpec: function(spec) {
			var promises, instances, components, id, d;

			instances = this.instances;
			components = this.components;
			promises = [];

			// Setup a promise for each item in this scope
			for (id in spec) {
				// An initializer may have inserted concrete components
				// into the context.  If so, they override components of the
				// same name from the input spec
				if(!object.hasOwn(instances, id)) {
					d = defer();
					components[id] = this._createComponentDef(id, spec[id], d.resolver);
					promises.push(instances[id] = d.promise);
				}
			}

			return whenAll(promises);
		},

		_createComponentDef: function(id, spec, resolver) {
			var path = this._createPath(id, this.path);
			return { id: id, spec: spec, path: path, resolver: resolver };
		},

		_createComponents: function() {
			// Process/create each item in scope and resolve its
			// promise when completed.
			var components = this.components;
			Object.keys(components).forEach(function(name) {
				this._createScopeItem(components[name]);
			}.bind(this));
		},

		_createScopeItem: function(component) {
			// NOTE: Order is important here.
			// The object & local property assignment MUST happen before
			// the chain resolves so that the concrete item is in place.
			// Otherwise, the whole scope can be marked as resolved before
			// the final item has been resolved.
			var item, itemResolver, self;

			self = this;
			item = this._resolveItem(component);
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

		_resolveItem: function(component) {
			var item, spec;

			spec = component.spec;

			if (this.resolver.isRef(spec)) {
				// Reference
				item = this._resolveRef(spec, component.id);
			} else {
				// Component
				item = this._createItem(component);
			}

			return item;
		},

		_createItem: function(component) {
			var created, spec;

			spec = component.spec;

			if (Array.isArray(spec)) {
				// Array
				created = this._createArray(component);

			} else if (object.isObject(spec)) {
				// component spec, create the component
				created = this._createComponent(component);

			} else {
				// Plain value
				created = when.resolve(spec);
			}

			return created;
		},

		_createArray: function(component) {
			var self, id, i;

			self = this;
			id = component.id;
			i = 0;

			// Minor optimization, if it's an empty array spec, just return an empty array.
			return when.map(component.spec, function(item) {
				var componentDef = self._createComponentDef(id + '[' + (i++) + ']', item);
				return self._resolveItem(componentDef);
			});
		},

		_createComponent: function(component) {
			var self = this;

			return this.componentFactory.createInstance(component)
				.otherwise(function (reason) {
					if(reason !== component) {
						throw reason;
					}

					// No factory found, treat object spec as a nested scope
					return createScope(component.spec, self).then(function(childScope) {
						// TODO: find a lighter weight solution
						// We are effectively paying the cost of creating a complete scope,
						// and then discarding everything except the component map.
						return object.mixin({}, childScope.instances);
					});
				}
			);
		},

		_ensureAllModulesLoaded: function() {
			var self = this;
			this.modulesReady.resolve(async.until(waitForModules, 0, allModulesLoaded));
			return this.modulesReady.promise;

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
			var instances = this.instances;
			return this.componentFactory.destroy().then(function() {
				for (var p in  instances) {
					delete instances[p];
				}
			});
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

	function noop() {}

	function WireContext() {}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(require); }
);