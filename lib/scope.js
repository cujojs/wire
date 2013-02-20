/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define) { 'use strict';
define(function(require) {

	var when, sequence, array, object, async, loader, Lifecycle, Resolver,
		proxy, createPluginRegistry, defaultPlugins,
		defer, chain, whenAll, scope, undef;

	when = require('when');
	sequence = require('when/sequence');
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
			var self, ready, contextDestroyed, destroyChildren, taskContext;

			self = this;
			ready = defer();
			contextDestroyed = defer();
			destroyChildren = defer();

			this.parent = parent || {};
			this.ready = ready.promise;
			this.destroyed = contextDestroyed.promise;

			this._inherit(this.parent, ready.promise, contextDestroyed.promise);
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
				destroyChildren.resolve();
				return contextDestroyed.resolve(this._destroyComponents());
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

		getProxy: function(nameOrComponent, onBehalfOf) {
			var self = this;
			return typeof nameOrComponent == 'string'
				? when(this._resolveRefName(nameOrComponent, {}, onBehalfOf), function (component) {
					return self._createProxy(component);
				})
				: self._createProxy(nameOrComponent);
		},

		_createProxy: function(component, metadata) {
			var self, lifecycle;

			self = this;
			lifecycle = this.lifecycle;

			return when(this.modulesReady, function() {
				// Create the base proxy
				var componentProxy = proxy.create(component, lifecycle, metadata);

				// Allow proxy plugins to process/modify the proxy
				componentProxy = self.plugins.proxiers.reduce(
					function(proxy, proxyHandler) {
						return proxyHandler(proxy) || proxy;
					},
					componentProxy
				);

				if(metadata) {
					componentProxy.path = metadata.path = self._createPath(metadata.id);
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
						spec: spec[name],
						promise: d.promise,
						resolver: d.resolver
					};

					promises.push(components[name] = d.promise);
				}
			}

			// When all scope item promises are resolved, the scope
			// is ready. When this scope is ready, resolve the promise
			// with the objects that were created
			scopeResolver.resolve(whenAll(promises).yield(this));
//			chain(whenAll(promises), scopeResolver, this);
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
			var item, itemResolver, self;

			self = this;
			item = this._resolveItem(spec, itemMetadata);
			itemResolver = itemMetadata.resolver;

			when(item, function (resolved) {
				self._makeResolvable(itemMetadata, resolved);
				itemResolver.resolve(resolved);
			}, itemResolver.reject);
		},

		_makeResolvable: function(metadata, component) {
			var id = metadata.id;
			if(id != null) {
				this.components[id] = proxy.getTarget(async.getValue(component));
			}
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
				function (found) {
					var component, factory, options;

					component = defer();
					factory = found.factory;
					options = found.options;

					if (!spec.id) {
						spec.id = name;
					}

					factory(component.resolver, options,
						self._pluginApi.contextualize(name));

					return when(component.promise, function(createdComponent) {
						return self.plugins.isPlugin(createdComponent)
							? createdComponent
							: self._processComponent(createdComponent, componentMetadata);
					}).then(proxy.getTarget);
				},
				function () {
					// No factory found, treat object spec as a nested scope
					return createScope(spec, self).then(function(childScope) {
						// TODO: find a lighter weight solution
						// We are effectively paying the cost of creating a complete scope,
						// and then discarding everything except the component map.
						return object.mixin({}, childScope.components);
					});
				}
			);
		},

		_processComponent: function(component, metadata) {
			var lifecycle, self;

			lifecycle = this.lifecycle;
			self = this;

			return when(self._createProxy(component, metadata), function(proxy) {
				return proxy.init();

			}).then(function(proxy) {
				// Components become resolvable after the initialization phase
				// This allows circular references to be resolved after init
				self._makeResolvable(metadata, proxy);
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
				var components, p;

				components = self.components;

				for (p in  components) {
					delete components[p];
				}

				return when.reduce(self.proxiedComponents,
					function(_, proxied) { return proxied.destroy(); },
					undef);
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

		_resolveRef: function(ref, name) {
			var scope;

			ref = this.resolver.parse(ref);
			scope = name == ref.name && this.parent.components ? this.parent : this;

			return this._doResolveRef(ref, scope.components, name);
		},

		_resolveRefName: function(refName, options, onBehalfOf) {
			var ref = this.resolver.create(refName, options);

			return this._doResolveRef(ref, this.components, onBehalfOf);
		},

		_doResolveRef: function(ref, scope, onBehalfOf) {
			return when(this.modulesReady, resolveRef);

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