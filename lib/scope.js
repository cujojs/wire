/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(['require', 'when', 'when/sequence', './array', './object', './async', './loader', './lifecycle', './resolver', './proxy', './plugin/registry', './plugin/defaultPlugins'],
function(require, when, sequence, array, object, async, loader, Lifecycle, Resolver, proxy, createPluginRegistry, defaultPlugins) {

	'use strict';

	var defer, chain, whenAll, scope, undef;

	defer = when.defer;
	chain = when.chain;
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
			var self, ready, destroyed;

			self = this;
			ready = defer();
			destroyed = defer();

			this.parent = parent || {};
			this.ready = ready.promise;
			this.destroyed = destroyed.promise;

			this._inherit(this.parent, ready.promise, destroyed.promise);
			this._initPluginApi();
			this._initDefaultPlugins();
			this._configure();

			this._destroy = function() {
				this._destroy = noop;
				return this._destroyComponents(destroyed.resolver)
					.then(this._executeDestroyers.bind(this));
			};

			return this._executeInitializers().then(finalizeScope);

			function finalizeScope() {

				var componentsToCreate = self._parseSpec(spec, ready.resolver);

				self._createComponents(spec, componentsToCreate);

				// Once all modules are loaded, all the components can finish
				self._ensureAllModulesLoaded();

				// Return promise
				// Context will be ready when this promise resolves
				return ready.promise;
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
				: moduleId, module);
			return module.promise;

			function scanPluginWhenLoaded(loadModulePromise, moduleReadyResolver) {

				var loadPromise = when(loadModulePromise, function (module) {
					return when(self._scanPlugin(module, spec), function() {
						chain(self.modulesReady, moduleReadyResolver, module);
					});
				}, moduleReadyResolver.reject);

				self.modulesToLoad && self.modulesToLoad.push(loadPromise);

			}
		},

		getProxy: function(nameOrComponent, onBehalfOf) {
			var self = this;
			return typeof nameOrComponent == 'string'
				? when(this._resolveRefName(nameOrComponent, {}, onBehalfOf), function (component) {
					return self._createProxy(component);
				})
				: self._createProxy(nameOrComponent);
		},

		_createProxy: function(component, spec) {
			var self = this;

			return when(this.modulesReady, function() {
				var componentProxy, id;

				componentProxy = self.plugins.proxiers.reduce(function(proxy, proxyHandler) {
					return proxyHandler(proxy) || proxy;
				}, proxy.create(component));

				componentProxy.spec = spec;
				if(spec) {
					id = spec && spec.id;
					componentProxy.id = id;
					componentProxy.path = self._createPath(id);
					self.proxiedComponents.push(componentProxy);
				}

				return componentProxy;
			});
		},

		_inherit: function(parent, ready, destroyed) {
			var self = this;

			// Descend scope and plugins from parent so that this scope can
			// use them directly via the prototype chain

			this._api = {
				createChild: wireChild.bind(this),
				destroy: this.destroy.bind(this),
				resolve: function(ref, onBehalfOf) {
					return when.resolve(self._resolveRefName(ref, {}, onBehalfOf));
				}
			};

			WireContext.prototype = this._createWireApi(this._api, object.inherit(parent.components));
			this.components = new WireContext();
			WireContext.prototype = undef;

			this.path = this._createPath(this.name, parent.path);
			this.plugins = createPluginRegistry(parent.pluginRegistry||{}, ready, destroyed);

			this.contextHandlers.init = array.delegate(this.contextHandlers.init);
			this.contextHandlers.destroy = array.delegate(this.contextHandlers.destroy);

			this.proxiedComponents = [];

			// These should not be public
			this.modulesToLoad = [];
			this.modulesReady = defer();
			this.moduleLoader = loader(parent, { require: self.require }).load;

			// When the parent begins its destroy phase, this child must
			// begin its destroy phase and complete it before the parent.
			// The context hierarchy will be destroyed from child to parent.
			if (parent.destroyed) {
				when(parent.destroyed, this.destroy.bind(this));
			}

			function wireChild(spec, options) {
				return this.createContext(spec, {
					moduleLoader: self.moduleLoader,
					components: self.components,
					destroyed: destroyed
				}, options);
			}
		},

		_initPluginApi: function() {
			// Plugin API
			// wire() API that is passed to plugins.
			var self, pluginApi;

			self = this;
			pluginApi = this._pluginApi = function (spec, name, path) {
				return self._createItem(spec, self._createPath(name, path));
			};

			pluginApi.createChild = this._api.createChild;
			pluginApi.resolveRef = this._api.resolve;
			pluginApi.getProxy = this.getProxy.bind(this);
			pluginApi.loadModule = this.getModule.bind(this);
		},

		_initDefaultPlugins: function() {
			defaultPlugins.forEach(this._scanPlugin, this);
		},

		_createWireApi: function(api, context) {
			var wireApi = this._wireApi = context.wire = function() {
				return api.createChild.apply(undef, arguments);
			};
			wireApi.destroy = context.destroy = api.destroy;

			// Consider deprecating resolve
			// Any reference you could resolve using this should simply be injected instead.
			wireApi.resolve = context.resolve = api.resolve;

			return context;
		},

		_configure: function() {
			var config = {
				pluginApi: this._pluginApi,
				resolvers: this.plugins.resolvers,
				facets: this.plugins.facets,
				listeners: this.plugins.listeners
			};

			this.lifecycle = new Lifecycle(config);
			this.resolver = this._pluginApi.resolver = new Resolver(config);
		},

		_executeInitializers: function() {
			return sequence(this.contextHandlers.init, this.context);
		},

		_parseSpec: function(spec, scopeResolver) {
			var promises, components, componentsToCreate, name;

			components = this.components;
			promises = [];
			componentsToCreate = {};

			// Setup a promise for each item in this scope
			for (name in spec) {
				// An initializer may have inserted concrete components
				// into the context.  If so, they override components of the
				// same name from the input spec
				if(!(components.hasOwnProperty(name))) {
					promises.push(componentsToCreate[name] = components[name] = defer());
				}
			}

			// When all scope item promises are resolved, the scope
			// is ready. When this scope is ready, resolve the promise
			// with the objects that were created
			chain(whenAll(promises), scopeResolver, this);

			return componentsToCreate;

		},

		_createComponents: function(spec, componentsToCreate) {
			// Process/create each item in scope and resolve its
			// promise when completed.
			for (var name in componentsToCreate) {
				this._createScopeItem(name, spec[name], this.components[name]);
			}

		},

		_createScopeItem: function(name, spec, itemResolver) {
			// NOTE: Order is important here.
			// The object & local property assignment MUST happen before
			// the chain resolves so that the concrete item is in place.
			// Otherwise, the whole scope can be marked as resolved before
			// the final item has been resolved.
			var p, self;

			self = this;
			p = this._createItem(spec, name);

			when(p, function (resolved) {
				self._makeResolvable(name, resolved);
				itemResolver.resolve(resolved);
			}, itemResolver.reject);
		},

		_makeResolvable: function(name, component) {
			this.components[name] = async.getValue(component);
		},

		_createItem: function(val, name) {
			var created;

			if (this.resolver.isRef(val)) {
				// Reference
				created = this._resolveRef(val, name);

			} else if (Array.isArray(val)) {
				// Array
				created = this._createArray(val, name);

			} else if (object.isObject(val)) {
				// component spec, create the component
				created = this._realizeComponent(val, name);

			} else {
				// Plain value
				created = when.resolve(val);
			}

			return created;

		},

		_createArray: function(arrayDef, name) {
			var self = this;
			// Minor optimization, if it's an empty array spec, just return an empty array.
			return arrayDef.length
				? when.map(arrayDef, function(item) {
					return self._createItem(item, name + '[]');
				})
				: [];
		},

		_realizeComponent: function(spec, name) {

			var self = this;
			// Look for a factory, then use it to create the object
			return when(this._findFactory(spec),
				function (factory) {
					var component = defer();

					if (!spec.id) {
						spec.id = name;
					}

					factory(component.resolver, spec, self._pluginApi);

					return self._processComponent(component, spec, name);
				},
				function () {
					// No factory found, treat object spec as a nested scope
					return createScope(spec, this).then(function(childScope) {
						return object.safeMixin({}, childScope.components);
					});
				}
			);
		},

		_processComponent: function(component, spec, name) {
			var self = this;

			return when(component, function(component) {

				return when(self._createProxy(component, spec), function(proxy) {
					return self.lifecycle.init(proxy);

				}).then(function(proxy) {
						// Components become resolvable after the initialization phase
						// This allows circular references to be resolved after init
						self._makeResolvable(name, proxy.target);
						return self.lifecycle.startup(proxy);

					}).then(function(proxy) {
						return proxy.target;

					});
			});
		},

		_findFactory: function(spec) {

			var plugins = this.plugins;

			return getFactory() || when(this.modulesReady, function () {
				return getFactory() || when.reject(spec);
			});

			function getFactory() {
				var f, factories, factory;

				factories = plugins.factories;

				for (f in factories) {
					if (spec.hasOwnProperty(f)) {
						factory = factories[f];
						break;
					}
				}

				// Intentionally returns undefined if no factory found
				return factory;
			}
		},

		_ensureAllModulesLoaded: function() {
			var modulesReady, modulesToLoad;

			modulesReady = this.modulesReady;
			modulesToLoad = this.modulesToLoad;

			whenAll(modulesToLoad, function (modules) {
				modulesReady.resolve(modules);
				modulesToLoad = undef;
			}, modulesReady.reject);
		},

		_scanPlugin: function(module, spec) {
			return this.plugins.scanModule(module, spec);
		},

		_destroy: noop,

		_destroyComponents: function(destroyResolver) {
			var lifecycle, self;

			self = this;
			lifecycle = this.lifecycle;

			destroyResolver.resolve();

			return when.reduce(this.proxiedComponents, function(unused, proxied) {
				return lifecycle.shutdown(proxied);
			}, undef)
				.then(destroyComponents)
				.then(releaseResources)
				.then(this._executeDestroyers.bind(this));

			function destroyComponents() {
				function deleteAll(container) {
					for(var p in container) {
						delete container[p];
					}
				}

				deleteAll(self.components);
				return when.reduce(self.proxiedComponents, destroyComponent, undef);
			}

			function destroyComponent(p, proxied) {
				return when(p, function() {
					return proxied.destroy();
				});
			}

			function releaseResources() {
				// Free Objects
				self.components = self.parent = self.wireApi
					= self.proxiedComponents = self._pluginApi = self.plugins
					= undef;
			}
		},

		_executeDestroyers: function() {
			return sequence(this.contextHandlers.destroy, this.context);
		},

		_doResolveRef: function(ref, scope, onBehalfOf) {
			return ref.resolver ? when(this.modulesReady, ref.resolve) : this._doResolveDeepRef(ref.name, scope);
		},

		_doResolveDeepRef: function(name, scope) {
			var parts = name.split('.');

			if(parts.length > 2) {
				return when.reject('Only 1 "." is allowed in refs: ' + name);
			}

			return when.reduce(parts, function(scope, segment) {
				return segment in scope
					? scope[segment]
					: when.reject('Cannot resolve ref: ' + name);
			}, scope);
		},

		_resolveRef: function(ref, name) {
			var scope;

			ref = this.resolver.parse(ref);
			scope = name == ref.name && this.parent.components ? this.parent.components : this.components;

			return this._doResolveRef(ref, scope, name);
		},

		_resolveRefName: function(refName, options, onBehalfOf) {
			return this._doResolveRef(this.resolver.create(refName, options), this.components, onBehalfOf);
		},

		_createPath: function(name, basePath) {
			var path = basePath || this.path;
			return (path && name) ? (path + '.' + name) : name;
		}
	};

	return createScope;

	function noop() {}

	function WireContext() {}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(deps, factory) {
	module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
		return require(x);
	})));
});