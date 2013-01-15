/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define) { 'use strict';
define(function(require) {

	var when, sequence, poll, array, object, async, loader, Lifecycle, Resolver,
		proxy, createPluginRegistry, defaultPlugins,
		defer, chain, whenAll, scope, undef;

	when = require('when');
	sequence = require('when/sequence');
	poll = require('when/poll');
	array = require('./array');
	object = require('./object');
	async = require('./async');
	loader = require('./loader');
	Lifecycle = require('./lifecycle');
	Resolver = require('./resolver');
	proxy = require('./proxy');
	createPluginRegistry = require('./plugin/registry');
	defaultPlugins = require('./plugin/defaultPlugins');

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
			var self, ready, destroyed, taskContext;

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

			taskContext = {
				components: this.components,
				spec: this.spec
			};

			this._executeTasks = function(tasks) {
				return sequence(tasks, taskContext);
			};

			this._destroy = function() {
				this._destroy = noop;
				return this._destroyComponents(destroyed.resolver);
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
						chain(self.modulesReady, moduleReadyResolver, module);
					});
				}, moduleReadyResolver.reject);

				self.modulesToLoad && self.modulesToLoad.push(loadPromise);

			}
		},

		getProxy: function(nameOrComponent /*, onBehalfOf */) {
			var self = this;
			return typeof nameOrComponent == 'string'
				? when(this._resolveRefName(nameOrComponent, {} /*, onBehalfOf */), function (component) {
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

			this.metadata = object.inherit(parent.metadata);

			this.path = this._createPath(this.name, parent.path);
			this.plugins = createPluginRegistry(parent.plugins||{}, ready, destroyed);

			this.contextHandlers.init = array.delegate(this.contextHandlers.init);
			this.contextHandlers.destroy = array.delegate(this.contextHandlers.destroy);

			this.proxiedComponents = [];

			// These should not be public
			this.modulesToLoad = [];
			this.modulesReady = defer();
			this.moduleLoader = loader(parent, this).load;

			// When the parent begins its destroy phase, this child must
			// begin its destroy phase and complete it before the parent.
			// The context hierarchy will be destroyed from child to parent.
			if (parent.destroyed) {
				when(parent.destroyed, this.destroy.bind(this));
			}

			function wireChild(spec, options) {
				return self.createContext(spec, {
					moduleLoader: self.moduleLoader,
					components: self.components,
					metadata: self.metadata,
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
				return self._resolveItem(spec, { id: self._createPath(name, path) });
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
				plugins: this.plugins
			};

			this.lifecycle = new Lifecycle(config);
			this.resolver = this._pluginApi.resolver = new Resolver(config);
		},

		_executeInitializers: function() {
			return this._executeTasks(this.contextHandlers.init);
		},

		_parseSpec: function(spec, scopeResolver) {
			var promises, components, metadata, name, d;

			components = this.components;
			metadata = this.metadata;
			promises = [];

			// Setup a promise for each item in this scope
			for (name in spec) {
				// An initializer may have inserted concrete components
				// into the context.  If so, they override components of the
				// same name from the input spec
				if(!object.hasOwn(components, name)) {
					d = defer();

					metadata[name] = {
						id: name,
						spec: spec,
						promise: d.promise,
						resolver: d.resolver
					};

					promises.push(components[name] = d.promise);
				}
			}

			// When all scope item promises are resolved, the scope
			// is ready. When this scope is ready, resolve the promise
			// with the objects that were created
			chain(whenAll(promises), scopeResolver, this);
		},

		_createComponents: function(spec) {
			// Process/create each item in scope and resolve its
			// promise when completed.
			var metadata = this.metadata;
			Object.keys(metadata).forEach(function(name) {
				this._createScopeItem(spec[name], metadata[name]);
			}.bind(this));
		},

		_createScopeItem: function(spec, itemMetadata) {
			// NOTE: Order is important here.
			// The object & local property assignment MUST happen before
			// the chain resolves so that the concrete item is in place.
			// Otherwise, the whole scope can be marked as resolved before
			// the final item has been resolved.
			var name, item, self;

			self = this;
			name = itemMetadata.id;
			item = this._resolveItem(spec, itemMetadata);

			when(item, function (resolved) {
				self._makeResolvable(itemMetadata, resolved);
				itemMetadata.resolver.resolve(resolved);
			}, itemMetadata.resolver.reject);
		},

		_makeResolvable: function(metadata, component) {
			this.components[metadata.id] = proxy.getTarget(async.getValue(component));
		},

		_resolveItem: function(spec, itemMetadata) {
			var item;

			if (this.resolver.isRef(spec)) {
				// Reference
				item = this._resolveRef(spec, itemMetadata.id);
			} else {
				// Component
				item = this._createItem(spec, itemMetadata);
			}

			return item;
		},

		_createItem: function(spec, itemMetadata) {
			var created;

			if (Array.isArray(spec)) {
				// Array
				created = this._createArray(spec, itemMetadata);

			} else if (object.isObject(spec)) {
				// component spec, create the component
				created = this._createComponent(spec, itemMetadata);

			} else {
				// Plain value
				created = when.resolve(spec);
			}

			return created;
		},

		_createArray: function(arrayDef, arrayMetadata) {
			var self = this;
			// Minor optimization, if it's an empty array spec, just return an empty array.
			return arrayDef.length
				? when.map(arrayDef, function(item) {
					return self._resolveItem(item, { id: arrayMetadata.id + '[]' });
				})
				: [];
		},

		_createComponent: function(spec, componentMetadata) {

			var self, name;

			self = this;
			name = componentMetadata.id;

			// Look for a factory, then use it to create the object
			return when(this._findFactory(spec),
				function (factory) {
					var component = defer();

					if (!spec.id) {
						spec.id = name;
					}

					factory(component.resolver, spec, self._pluginApi);

					return when(component.promise, function(createdComponent) {
						return self.plugins.isPlugin(createdComponent)
							? createdComponent
							: self._processComponent(createdComponent, spec, componentMetadata);
					}).then(proxy.getTarget);
				},
				function () {
					// No factory found, treat object spec as a nested scope
					return createScope(spec, self).then(function(childScope) {
						return object.safeMixin({}, childScope.components);
					});
				}
			);
		},

		_processComponent: function(component, spec, componentMetadata) {
			var lifecycle, self;

			lifecycle = this.lifecycle;
			self = this;

			return when(self._createProxy(component, spec), function(proxy) {
				componentMetadata.proxy = proxy;
				return self.lifecycle.init(proxy, componentMetadata);

			}).then(function(proxy) {
				// Components become resolvable after the initialization phase
				// This allows circular references to be resolved after init
				self._makeResolvable(componentMetadata, proxy);
				return self.lifecycle.startup(proxy, componentMetadata);

			});
		},

		_findFactory: function(spec) {

			var plugins = this.plugins;

			return getFactory() || when(this.modulesReady.promise, function () {
				return getFactory() || when.reject(spec);
			});

			function getFactory() {
				var f, factories, factory;

				factories = plugins.factories;

				for (f in factories) {
					if (object.hasOwn(spec, f)) {
						factory = factories[f];
						break;
					}
				}

				// Intentionally returns undefined if no factory found
				return factory;
			}
		},

		_ensureAllModulesLoaded: function() {
			var self = this;
			this.modulesReady.resolve(poll(waitForModules, 0, allModulesLoaded));

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
			var metadata;
			if(spec && spec.id) {
				metadata = this.metadata[spec.id];
				if(metadata) {
					metadata.isPlugin = this.plugins.isPlugin(module);
				}
			}
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
			return this._executeTasks(this.contextHandlers.destroy);
		},

		_doResolveRef: function(ref, scope /*, onBehalfOf */) {
			return ref.resolver
				? when(this.modulesReady, ref.resolve)
				: this._doResolveDeepRef(ref.name, scope);
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

			return this._doResolveRef(ref, scope /*, name */);
		},

		_resolveRefName: function(refName, options /*, onBehalfOf */) {
			return this._doResolveRef(this.resolver.create(refName, options), this.components /*, onBehalfOf */);
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
	: function(factory) { module.exports = factory(require); }
);