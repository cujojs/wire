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
		ComponentFactory, Lifecycle, Resolver, DirectedGraph, trackInflightRefs,
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
	DirectedGraph = require('./graph/DirectedGraph');
	trackInflightRefs = require('./graph/trackInflightRefs');
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
			var self, destroyed, contextEventApi;

			self = this;
			destroyed = defer();

			this.parent = parent || {};
			this.destroyed = destroyed.promise;

			this._inherit(this.parent, destroyed.promise);
			this._initPluginApi();
			this._installDefaultPlugins();
			this._configure();

			this._destroy = function() {
				var destroySequence = [
					self._createContextEvent('shutdown', contextEventApi),
					function() {
						return self._destroyComponents();
					},
					self._createContextEvent('destroy', contextEventApi),
					function() {
						return self._releaseResources();
					}
				];

				this._destroy = noop;
				destroyed.resolve();

				return sequence(destroySequence);
			};

			contextEventApi = self._pluginApi.contextualize(self.path);

			return self._executeInitializers().then(function() {
				var startupSequence = [
					function(parsed) {
						return self._installPlugins(parsed.plugins)
					},
					self._createContextEvent('initialize', contextEventApi),
					function(parsed) {
						return self._createComponents(parsed.components);
					},
					self._createContextEvent('ready', contextEventApi)
				];

				return sequence(startupSequence, self._parseSpec(spec)).yield(self);
			});
		},

		_createContextEvent: function(type, api) {
			var self = this;
			return function() {
				var listeners = self.plugins.contextListeners;
				return when.reduce(listeners, function(undef, listener) {
					var d;

					if(listener[type]) {
						d = defer();
						listener[type](d.resolver, api);
						return d.promise;
					}

					return undef;
				}, undef);
			}
		},

		_installDefaultPlugins: function() {
			var self = this;
			// Add a contextualized module factory
			this.plugins.registerPlugin({ factories: {
				module: function(resolver, componentDef) {
					resolver.resolve(self.getModule(componentDef.options));
				}
			}});

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
				} else if(typeof pluginSpec.wire$plugin == 'function') {
					module = pluginSpec;
				} else if(t == 'function') {
					module = { wire$plugin: pluginSpec };
				}

				return self.getModule(module).then(function(plugin) {
					return registry.scanModule(plugin, pluginSpec, namespace);
				});
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

		getModule: function(moduleId) {
			return typeof moduleId == 'string'
				? this.moduleLoader(moduleId)
				: when.resolve(moduleId);
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

			this.lifecycle = this._createLifecycle(config);
			this.resolver = this._pluginApi.resolver = this._createResolver(config);
			this.componentFactory = this._createComponentFactory(this.lifecycle, config);
		},

		_createLifecycle: function(config) {
			var self, lifecycle, init;

			self = this;
			lifecycle = new Lifecycle(config);
			init = lifecycle.init;

			lifecycle.init = function() {
				return when(init.apply(lifecycle, arguments), function(proxy) {
					self._makeResolvable(proxy.metadata, proxy);
					return proxy;
				});
			};

			return lifecycle;
		},

		_createResolver: function(config) {
			var resolver = new Resolver(config);
			return trackInflightRefs(new DirectedGraph(), resolver, this.refCycleTimeout);
		},

		_createComponentFactory: function(lifecycle, config) {
			return new ComponentFactory(lifecycle, config);
		},

		_executeInitializers: function() {
			return sequence(this.contextHandlers.init, this);
		},

		_parseSpec: function(spec) {
			var instances, components, plugins, id, d;

			instances = this.instances;
			components = this.components;

			// Setup a promise for each item in this scope
			for (id in spec) {
				if(id === '$plugins' || id === 'plugins') {
					plugins = spec[id];
				} else if (!object.hasOwn(instances, id)) {
					// An initializer may have inserted concrete components
					// into the context.  If so, they override components of the
					// same name from the input spec
					d = defer();
					components[id] = this._createComponentDef(id, spec[id], d.resolver);
					instances[id] = d.promise;
				}
			}

			return { plugins: plugins, components: components, instances: instances };
		},

		_createComponentDef: function(id, spec, resolver) {
			var path = this._createPath(id, this.path);
			return { id: id, spec: spec, path: path, resolver: resolver };
		},

		_createComponents: function(components) {
			// Process/create each item in scope and resolve its
			// promise when completed.
			return when.all(Object.keys(components).map(function(name) {
				return this._createScopeItem(components[name]);
			}.bind(this)));
		},

		_createScopeItem: function(component) {
			// NOTE: Order is important here.
			// The object & local property assignment MUST happen before
			// the chain resolves so that the concrete item is in place.
			// Otherwise, the whole scope can be marked as resolved before
			// the final item has been resolved.
			var self, item;

			self = this;
			item = this._resolveItem(component).then(function (resolved) {
				self._makeResolvable(component, resolved);
				return resolved;
			});

			component.resolver.resolve(item);
			return item;
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
			return ref.resolve(function (name) {
				return resolveDeepName(name, scope);
			}, onBehalfOf);
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