/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author brian@hovercraftstudios.com
 */

(function(define) { 'use strict';
define(function(require) {

	var when, defer, sequence, array, object, loader, Map,
		ComponentFactory, Lifecycle, Resolver, WireProxy, PluginRegistry,
		undef, specUtils, DirectedGraph, cyclesTracker;

	when = require('when');
	sequence = require('when/sequence');
	array = require('./array');
	object = require('./object');
	Map = require('./Map');
	loader = require('./loader/adapter');
	ComponentFactory = require('./ComponentFactory');
	Lifecycle = require('./lifecycle');
	Resolver = require('./resolver');
	WireProxy = require('./WireProxy');
	PluginRegistry = require('./plugin/registry');
	specUtils = require('./specUtils');
	DirectedGraph = require('./graph/DirectedGraph');
	cyclesTracker = require('./graph/cyclesTracker');
	
	defer = when.defer;

	function Scope(parent, options) {
		this.parent = parent||{};
		object.mixin(this, options);
	}

	Scope.prototype = {

		init: function(spec) {

			this._inherit(this.parent);
			this._init();
			this._configure();

			return this._startup(spec).yield(this);
		},

		_inherit: function(parent) {

			this._instanceToProxy = new Map();

			this.instances = this._inheritInstances(parent);
			this.components = object.inherit(parent.components);

			this.path = this._createPath(this.name, parent.path);

			this.plugins = parent.plugins;

			this.initializers = array.delegate(this.initializers);
			this.destroyers = array.delegate(this.destroyers);
			this.postDestroy = array.delegate(this.postDestroy);

			if(!this.moduleLoader) {
				this.moduleLoader = parent.moduleLoader;
			}
		},

		_inheritInstances: function(parent) {
			return object.inherit(parent.instances);
		},

		_addDependent: function(dependant, tasks) {
			return dependant.then(
				function(dependant) {
					tasks.push(function() {
						return dependant.destroy();
					});
					return dependant;
				}
			);

		},

		_createNestedScope: function(spec) {
			var options = { createContext: this.createContext };
			return this._addDependent(
				new Scope(this, options).init(spec), this.postDestroy);
		},

		_createChildContext: function(spec, options) {
			// Create child and arrange for it to be destroyed just before
			// this scope is destroyed
			return this._addDependent(
				this.createContext(spec, this, options), this.destroyers);
		},

		_init: function() {
			this._pluginApi = this._initPluginApi();
		},

		_initPluginApi: function() {
			// Plugin API
			// wire() API that is passed to plugins.
			var self, pluginApi;

			self = this;
			pluginApi = {};

			pluginApi.contextualize = function(name) {
				function contextualApi(spec, id) {
					return self._resolveInstance(self._createComponentDef(id, spec));
				}

				contextualApi.createChild = self._createChildContext.bind(self);
				contextualApi.loadModule = self.getModule.bind(self);
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

			return pluginApi;

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

		_configure: function() {
			var plugins, pluginApi;

			plugins = this.plugins;
			pluginApi = this._pluginApi;

			this.resolver = this._createResolver(plugins, pluginApi);
			this.componentFactory = this._createComponentFactory(plugins, pluginApi);

			this._destroy = function() {
				this._destroy = noop;

				return this._executeDestroyers()
					.then(this._destroyComponents.bind(this))
					.then(this._releaseResources.bind(this))
					.then(this._executePostDestroy.bind(this));
			};
		},

		_startup: function(spec) {
			var self = this;

			return this._executeInitializers().then(function() {
				return self._parseSpec(spec).then(function(parsed){
					return self._createComponents(parsed).then(function() {
						return self._awaitInstances(parsed);
					});
				});
			});
		},

		destroy: function() {
			return this._destroy();
		},

		_destroy: noop,

		_destroyComponents: function() {
			var instances = this.instances;

			return this.componentFactory.destroy().then(function() {
				for (var p in instances) {
					delete instances[p];
				}
			});
		},

		_releaseResources: function() {
			// Free Objects
			this.instances = this.components = this.parent
				= this.resolver = this.componentFactory
				= this._instanceToProxy = this._pluginApi = this.plugins
				= undef;
		},

		getModule: function(moduleId) {
			return typeof moduleId == 'string'
				? this.moduleLoader(moduleId)
				: when.resolve(moduleId);
		},

		getProxy: function(nameOrInstance, onBehalfOf) {
			var self = this;

			if(typeof nameOrInstance === 'string') {
				return this._resolveRefName(nameOrInstance, {}, onBehalfOf)
					.then(function (instance) {
						return self._getProxyForInstance(instance);
					});
			} else {
				return self._getProxyForInstance(nameOrInstance);
			}
		},

		_getProxyForInstance: function(instance) {
			var componentFactory = this.componentFactory;

			return getProxyRecursive(this, instance).otherwise(function() {
				// Last ditch, create a new proxy
				return componentFactory.createProxy(instance);
			});
		},

		_createResolver: function(plugins, pluginApi) {
			return new Resolver(plugins.resolvers, pluginApi);
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

		_executeDestroyers: function() {
			return sequence(this.destroyers, this);
		},

		_executePostDestroy: function() {
			return sequence(this.postDestroy, this);
		},

		_parseSpec: function(spec) {
			var self = this;

			// instantiate the imports graph
			var importsGraph = new DirectedGraph();

			return processImports(self, spec, importsGraph).then(function(specImports){
				// modules of importing spec overrides modules of imported spec.
				return processSpec(self, object.mixin(specImports, spec));
			});
		},

		_createComponentDef: function(id, spec, initialized, ready) {
			return {
				id: id,
				spec: spec,
				path: this._createPath(id, this.path),
				initialized: initialized,
				ready: ready
			};
		},

		_createComponents: function(parsed) {
			// Process/create each item in scope and resolve its
			// promise when completed.
			var self, components;

			self = this;
			components = parsed.components;
			return when.map(Object.keys(components), function(name) {
				return self._createScopeItem(components[name]);
			});
		},

		_awaitInstances: function(parsed) {
			var ready = parsed.ready;
			return when.map(Object.keys(ready), function(id) {
				return ready[id];
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
				return WireProxy.getTarget(resolved);
			});

			component.ready.resolve(item);
			return item;
		},

		_makeResolvable: function(component, instance) {
			var id, inst;

			id = component.id;
			if(id != null) {
				inst = WireProxy.getTarget(instance);
				this.instances[id] = inst;
				if(component.proxy) {
					this._instanceToProxy.set(inst, component.proxy);
				}
				if(component.initialized) {
					component.initialized.resolve(inst);
				}
			}

			return instance;
		},

		_resolveInstance: function(component) {
			return this._resolveItem(component).then(WireProxy.getTarget);
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
				return self._resolveInstance(componentDef);
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
					return self._createNestedScope(component.spec)
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

		return when.reduce(parts, function(scope, segment) {
			return segment in scope
				? scope[segment]
				: when.reject(new Error('Cannot resolve ref: ' + name));
		}, scope);
	}

	function getProxyRecursive(scope, instance) {
		var proxy;

		if(scope._instanceToProxy) {
			proxy = scope._instanceToProxy.get(instance);
		}

		if(!proxy) {
			if(scope.parent) {
				return getProxyRecursive(scope.parent, instance);
			} else {
				return when.reject(new Error('No proxy found'));
			}
		}

		return when.resolve(proxy);
	}

	function noop() {}

	function processImports(scope, spec, importsGraph, importingModuleId) {
		if(!spec || !spec.$imports) {
			return when({});
		}

		if(typeof spec.$imports === 'string') {
			spec.$imports = [spec.$imports];
		}

		importingModuleId = importingModuleId || (typeof spec === 'string' ? spec : undefined);

		return when.reduce(spec.$imports, function(currentSpecImports, importedModuleId){
			// make sure that there is no cycles
			cyclesTracker.ensureNoCycles(importsGraph, importedModuleId, importingModuleId);

			// go ahead with the import
			return when(scope.getModule(importedModuleId), function(importedSpec){
				return processImports(scope, importedSpec, importsGraph, importedModuleId).then(function(importedSpecImports){
					// modules of importing spec overrides modules of imported specs.
					var importedSpecAndItsImports = object.mixin(importedSpecImports, importedSpec);

					// modules in the right overrides modules in the left
					currentSpecImports = object.mixin(currentSpecImports, importedSpecAndItsImports);

					return currentSpecImports;
				});
			});
		}, {});
	}

	function processSpec(scope, spec) {
		var instances, components, ready, plugins, id, initialized;

		instances = scope.instances;
		components = scope.components;
		ready = {};

		// Setup a promise for each item in this scope
		for (id in spec) {
			if(id === '$plugins' || id === 'plugins') {
				plugins = spec[id];
			} else if(!object.hasOwn(instances, id)) {
				// An initializer may have inserted concrete components
				// into the context.  If so, they override components of the
				// same name from the input spec
				initialized = defer();
				ready = defer();
				components[id] = scope._createComponentDef(id, spec[id], initialized, ready);
				instances[id] = initialized.promise;
				ready[id] = ready.promise;
			}
		}

		return when.resolve({
			plugins: plugins,
			components: components,
			instances: instances,
			ready: ready
		});
	}
});
})(typeof define == 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }
);