/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author brian@hovercraftstudios.com
 */

(function(define) { 'use strict';
define(function(require) {

	var when, defer, sequence, array, object, loader,
		ComponentFactory, Lifecycle, Resolver, DirectedGraph, trackInflightRefs,
		WireProxy, PluginRegistry, defaultPlugins,
		undef;

	when = require('when');
	sequence = require('when/sequence');
	array = require('./array');
	object = require('./object');
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

	function Scope(parent, options) {
		this.parent = parent||{};
		object.mixin(this, options);
	}

	Scope.prototype = {

		init: function(spec) {

			this._inherit(this.parent);
			this._initPlugins(this.parent.plugins);
			this._configure();

			return this._startup(spec).yield(this);
		},

		_inherit: function(parent) {

			// Descend scope and plugins from parent so that this scope can
			// use them directly via the prototype chain
			var contextApi;

			contextApi = object.inherit(parent.instances);
			contextApi.wire    = this._createChild.bind(this);
			contextApi.destroy = this.destroy.bind(this);
			contextApi.resolve = this._resolveRef.bind(this);

			WireContext.prototype = contextApi;

			this.instances = new WireContext();
			WireContext.prototype = undef;

			this.components = object.inherit(parent.components);

			this.path = this._createPath(this.name, parent.path);
			this.plugins = this._initPluginRegistry(parent.plugins);

			this.initializers = array.delegate(this.initializers);

			this.moduleLoader = loader(this.require, parent.moduleLoader).load;

			// TODO: Fix this
			// When the parent begins its destroy phase, this child must
			// begin its destroy phase and complete it before the parent.
			// The context hierarchy will be destroyed from child to parent.
			if (parent.destroyed) {
				when(parent.destroyed, this.destroy.bind(this));
			}
		},

		_createChild: function(spec, options) {
			return this.createContext(spec, this, options);
		},

		_createContextEvent: function (type) {
			var api, listeners;

			if(!this.contextEventApi) {
				this.contextEventApi = this._pluginApi.contextualize(this.path);
			}

			api = this.contextEventApi;
			listeners = this.plugins.contextListeners;

			return function() {
				return when.reduce(listeners, function(undef, listener) {
					var d;

					if(listener[type]) {
						d = defer();
						listener[type](d.resolver, api);
						return d.promise;
					}

					return undef;
				}, undef);
			};
		},

		_initPlugins: function(parentRegistry) {
			this._initPluginRegistry(parentRegistry);
			this._initPluginApi();
			this._installDefaultPlugins();
		},

		_initPluginRegistry: function(parentRegistry) {
			return new PluginRegistry(parentRegistry);
		},

		_initPluginApi: function() {
			// Plugin API
			// wire() API that is passed to plugins.
			var self, pluginApi;

			self = this;
			pluginApi = this._pluginApi = {};

			pluginApi.contextualize = function(name) {
				function contextualApi(spec, id) {
					return self._resolveItem(self._createComponentDef(id, spec));
				}

				contextualApi.createChild = self._createChild.bind(self);
				contextualApi.resolver = self.resolver;
				contextualApi.addComponent = addComponent;
				contextualApi.addInstance = addInstance;

				contextualApi.resolveRef = function(ref) {
					var onBehalfOf = arguments.length > 1 ? arguments[2] : name;
					return self._resolveRef(ref, onBehalfOf);
				};

				contextualApi.getProxy = function(nameOrComponent) {
					var onBehalfOf = arguments.length > 1 ? arguments[2] : name;
					return self.getProxy(nameOrComponent, onBehalfOf);
				};

				return contextualApi;
			};

			function addComponent(component, id) {
				var def, instance;

				def = self._createComponentDef(id);
				instance = self.componentFactory.processComponent(def, component);

				return self._makeResolvable(def, instance);
			}

			function addInstance(instance, id) {
				self._makeResolvable(self._createComponentDef(id), instance);
				return when.resolve(instance);
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
				} else {
					module = pluginSpec;
				}

				return self.getModule(module).then(function(plugin) {
					return registry.scanModule(plugin, pluginSpec, namespace);
				});
			}
		},

		_configure: function() {
			var plugins, pluginApi, self, destroyed;

			plugins = this.plugins;
			pluginApi = this._pluginApi;

			this.resolver = this._createResolver(plugins, pluginApi);
			this.componentFactory = this._createComponentFactory(plugins, pluginApi);

			self = this;
			destroyed = defer();
			this.destroyed = destroyed.promise;

			this._destroy = function() {
				var destroySequence = [
					self._createContextEvent('shutdown'),
					function() {
						return self._destroyComponents();
					},
					self._createContextEvent('destroy'),
					function() {
						return self._releaseResources();
					}
				];

				this._destroy = noop;
				destroyed.resolve();

				return sequence(destroySequence);
			};
		},

		_startup: function(spec) {
			var self = this;
			return this._executeInitializers().then(function() {
				var startupSequence = [
					function(parsed) {
						return self._installPlugins(parsed.plugins)
					},
					self._createContextEvent('initialize'),
					function(parsed) {
						return self._createComponents(parsed.components);
					},
					function(parsed) {
						return self._awaitInstances(parsed.instances);
					},
					self._createContextEvent('ready')
				];

				return sequence(startupSequence, self._parseSpec(spec));
			});
		},

		destroy: function() {
			return this._destroy();
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

		_releaseResources: function() {
			// Free Objects
			this.instances = this.components = this.parent
				= this.resolver = this.componentFactory
				= this._pluginApi = this.plugins
				= undef;
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
					return componentFactory.createProxy(component);
				})
				: componentFactory.createProxy(nameOrComponent);
		},

		_createResolver: function(plugins, pluginApi) {
			var resolver = new Resolver(plugins.resolvers, pluginApi);
			return trackInflightRefs(
				new DirectedGraph(), resolver, this.refCycleTimeout);
		},

		_createComponentFactory: function(plugins, pluginApi) {
			var self, factory, init, lifecycle;

			self = this;

			lifecycle = new Lifecycle(plugins, pluginApi);
			factory = new ComponentFactory(lifecycle, plugins, pluginApi);

			init = factory.initInstance;
			factory.initInstance = function() {
				return when(init.apply(factory, arguments), function(proxy) {
					return self._makeResolvable(proxy.metadata, proxy);
				});
			};

			return factory;
		},

		_executeInitializers: function() {
			return sequence(this.initializers, this);
		},

		_parseSpec: function(spec) {
			var instances, components, plugins, id, d;

			instances = this.instances;
			components = {};

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

			return {
				plugins: plugins,
				components: components,
				instances: instances
			};
		},

		_createComponentDef: function(id, spec, resolver) {
			return {
				id: id,
				spec: spec,
				path: this._createPath(id, this.path),
				resolver: resolver
			};
		},

		_createComponents: function(components) {
			// Process/create each item in scope and resolve its
			// promise when completed.
			var self = this;
			return when.map(Object.keys(components), function(name) {
				return self._createScopeItem(components[name]);
			});
		},

		_awaitInstances: function(instances) {
			return when.map(Object.keys(instances), function(id) {
				return instances[id];
			});
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
				this.instances[id] = WireProxy.getTarget(instance);
			}

			return instance;
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

			return this.componentFactory.create(component)
				.otherwise(function (reason) {
					if(reason !== component) {
						throw reason;
					}

					// No factory found, treat object spec as a nested scope
					return new Scope(self)
						.init(component.spec)
						.then(function (childScope) {
							// TODO: find a lighter weight solution
							// We're paying the cost of creating a complete scope,
							// then discarding everything except the instance map.
							return object.mixin({}, childScope.instances);
						}
					);
				}
			);
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

	return Scope;

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