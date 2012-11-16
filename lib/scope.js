/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(['require', 'when', 'when/timeout', './array', './object', './async', './loader', './pluginRegistry', './lifecycle', './resolver', './proxy', '../base'],
function(require, when, timeout, array, object, async, loader, createPluginRegistry, Lifecycle, Resolver, proxy, basePlugin) {

	'use strict';

	var defer, chain, whenAll, undef;

	// Local refs to when.js
	defer = when.defer;
	chain = when.chain;
	whenAll = when.all;

	return createScope;

	function WireContext() {}
	function WireScope() {}

	/**
	 * Do the work of creating a new scope and fully wiring its contents
	 * @private
	 *
	 * @param scopeDef {Object} The spec (or portion of a spec) to be wired into a new scope
	 * @param parent {scope} scope to use as the parent, and thus from which to inherit
	 *  plugins, components, etc.
	 * @param [options] {Object} scope options
	 *
	 * @return {Promise} a promise for the new scope
	 */
	function createScope(scopeDef, parent, options) {
		var scope, scopeParent, context, config, contextHandlers, createContext,
			proxiedComponents, components, lifecycle, resolver,
			pluginRegistry, pluginApi, moduleLoader, modulesToLoad,
			wireApi, modulesReady, scopeReady, scopeDestroyed, doDestroy;

		createContext = options.createContext;

		// Empty parent scope if none provided
		if(!parent) { parent = {}; }
		if(!options) { options = {}; }

		inheritFromParent(parent, options);
		createPluginApi();

		// TODO: Find a better way to load and scan the base plugin
		scanPlugin(basePlugin);

		configureContext(options);
		pluginApi.resolver = resolver;

		// Setup overwritable doDestroy so that this context
		// can only be destroyed once
		doDestroy = function () {
			// Retain a do-nothing doDestroy() func, in case
			// it is called again for some reason.
			doDestroy = function () {};

			return when(destroyContext(), executeDestroyers);
		};

		context = {
			spec: scopeDef,
			components: components,
			config: config
		};

		return executeInitializers()
			.then(function() {

				var componentsToCreate = parseSpec(scopeDef, scopeReady);

				createComponents(componentsToCreate, scopeDef);

				// Once all modules are loaded, all the components can finish
				ensureAllModulesLoaded();

				// Return promise
				// Context will be ready when this promise resolves
				return scopeReady.promise;
			});

		//
		// Initialization
		//

		function executeInitializers() {
			return async.sequence(contextHandlers.init, context);
		}

		function inheritFromParent(parent, options) {
			// Descend scope and plugins from parent so that this scope can
			// use them directly via the prototype chain
			scopeReady = defer();
			scopeDestroyed = defer();

			WireContext.prototype = createWireApi(object.inherit(parent.components));
			components = new WireContext();
			WireContext.prototype = undef;

			pluginRegistry = createPluginRegistry(parent.pluginRegistry||{}, scopeReady.promise, scopeDestroyed.promise);

			// Set/override integral resolvers and factories
			pluginRegistry.resolvers.wire = wireResolver;
			pluginRegistry.factories.wire = wireFactory;

			proxiedComponents = [];

			modulesToLoad = [];
			modulesReady = defer();

			moduleLoader = loader(parent, options).load;

			// A proxy of this scope that can be used as a parent to
			// any child scopes that may be created.
			scopeParent = new WireScope();
			scopeParent.moduleLoader = moduleLoader;
			scopeParent.components = components;
			scopeParent.destroyed = scopeDestroyed;

			// Full scope definition.  This will be given to sub-scopes,
			// but should never be given to child contexts
			scope = Object.create(scopeParent);
			scope.pluginRegistry = pluginRegistry;
			scope.resolveRef = resolveRefName;
			scope.destroy = destroy;
			scope.path = createPath(options.name, parent.path);

			// When the parent begins its destroy phase, this child must
			// begin its destroy phase and complete it before the parent.
			// The context hierarchy will be destroyed from child to parent.
			if (parent.destroyed) {
				when(parent.destroyed, destroy);
			}
		}

		function createWireApi(context) {
			wireApi = context.wire = wireChild;
			wireApi.destroy = context.destroy = apiDestroy;

			// Consider deprecating resolve
			// Any reference you could resolve using this should simply be
			// injected instead.
			wireApi.resolve = context.resolve = apiResolveRef;

			return context;
		}

		function createPluginApi() {
			// Plugin API
			// wire() API that is passed to plugins.
			pluginApi = function (spec, name, path) {
				return createItem(spec, createPath(name, path));
			};

			pluginApi.resolveRef = apiResolveRef;
			pluginApi.getProxy = getProxy;
			pluginApi.loadModule = getModule;
		}

		function configureContext(options) {
			// TODO: This configuration object needs to be abstracted and reused
			config = {
				pluginApi: pluginApi,
				resolvers: pluginRegistry.resolvers,
				facets:    pluginRegistry.facets,
				listeners: pluginRegistry.listeners
			};

			lifecycle = new Lifecycle(config);
			resolver = new Resolver(config);

			contextHandlers = {
				init: array.delegate(options.init),
				destroy: array.delegate(options.destroy)
			};
		}

		function parseSpec(scopeDef, scopeReady) {
			var promises, componentsToCreate, name;

			promises = [];
			componentsToCreate = {};

			// Setup a promise for each item in this scope
			for (name in scopeDef) {
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
			chain(whenAll(promises), scopeReady, scope);

			return componentsToCreate;
		}

		//
		// Context Startup
		//

		function createComponents(componentsToCreate, spec) {
			// Process/create each item in scope and resolve its
			// promise when completed.
			for (var name in componentsToCreate) {
				createScopeItem(name, spec[name], components[name]);
			}
		}

		function ensureAllModulesLoaded() {
			// Once all modules have been loaded, resolve modulesReady
			whenAll(modulesToLoad, function (modules) {
				modulesReady.resolve(modules);
				modulesToLoad = undef;
			}, modulesReady.reject);
		}

		//
		// Context Destroy
		//

		function executeDestroyers() {
			return async.sequence(contextHandlers.destroy, context);
		}

		function destroyContext() {
			var shutdown;

			scopeDestroyed.resolve();

			// TODO: Clear out the context prototypes?

			shutdown = when.reduce(proxiedComponents, function(unused, proxied) {
				return lifecycle.shutdown(proxied);
			}, undef);

			return when(shutdown, function () {
				function deleteAll(container) {
					for(var p in container) {
						delete container[p];
					}
				}

				deleteAll(components);
				deleteAll(scope);

				return when.reduce(proxiedComponents, function(p, proxied) {
					return when(p, function() {
						return proxied.destroy();
					});
				}, undef)
					.then(function() {
						// Free Objects
						components = scope = parent
							= wireApi = proxiedComponents
							= pluginApi = pluginRegistry
							= undef;

						return scopeDestroyed;

					});

			});
		}

		//
		// Context API
		//

		// API of a wired context that is returned, via promise, to
		// the caller.  It will also have properties for all the
		// objects that were created in this scope.

		/**
		 * Resolves a reference in the current context, using any reference resolvers
		 * available in the current context
		 *
		 * @param ref {String} reference name (may contain resolver prefix, e.g. "resolver!refname"
		 * @param {string} [onBehalfOf] name of component requesting the reference
		 */
		function apiResolveRef(ref, onBehalfOf) {
			return when(resolveRefName(ref, {}, onBehalfOf));
		}

		/**
		 * Destroys the current context
		 */
		function apiDestroy() {
			return destroy();
		}

		/**
		 * Wires a child spec with this context as its parent
		 * @param {String|Object|String[]|Object[]} spec
		 * @param {Object} options
		 */
		function wireChild(spec, options) {
			return createContext(spec, scopeParent, options);
		}

		//
		// Scope functions
		//

		function createPath(name, basePath) {
			var path = basePath || scope.path;

			return (path && name) ? (path + '.' + name) : name;
		}

		function createScopeItem(name, val, itemResolver) {
			// NOTE: Order is important here.
			// The object & local property assignment MUST happen before
			// the chain resolves so that the concrete item is in place.
			// Otherwise, the whole scope can be marked as resolved before
			// the final item has been resolved.
			var p = createItem(val, name);

			return when(p, function (resolved) {
				makeResolvable(name, resolved);
				itemResolver.resolve(resolved);
			}, itemResolver.reject);
		}

		/**
		 * Make a component resolvable under the given name
		 * @param name {String} name by which to allow the component to be resolved
		 * @param component {*} component
		 */
		function makeResolvable(name, component) {
			components[name] = getResolvedValue(component);
		}

		function createItem(val, name) {
			var created;

			if (resolver.isRef(val)) {
				// Reference
				created = resolveRef(val, name);

			} else if (Array.isArray(val)) {
				// Array
				created = createArray(val, name);

			} else if (object.isObject(val)) {
				// component spec, create the component
				created = realizeComponent(val, name);

			} else {
				// Plain value
				created = when.resolve(val);
			}

			return created;
		}

		function getModule(moduleId, spec) {
			var module = defer();

			scanPluginWhenLoaded(typeof moduleId == 'string'
				? moduleLoader(moduleId)
				: moduleId, module);
			return module.promise;

			function scanPluginWhenLoaded(loadModulePromise, moduleReadyResolver) {

				var loadPromise = when(loadModulePromise, function (module) {
					return when(scanPlugin(module, spec), function() {
						chain(modulesReady, moduleReadyResolver, module);
					});
				}, moduleReadyResolver.reject);

				modulesToLoad && modulesToLoad.push(loadPromise);

			}
		}

		function scanPlugin(module, spec) {
			pluginRegistry.scanModule(module, spec);
		}

		function createArray(arrayDef, name) {
			// Minor optimization, if it's an empty array spec, just return
			// an empty array.
			return arrayDef.length
				? when.map(arrayDef, function(item) {
				return createItem(item, name + '[]');
			})
				: [];
		}

		/**
		 * Fully realize a component from a spec: create, initialize, then
		 * startup.
		 * @param spec {Object} component spec
		 * @param name {String} component name
		 * @return {Promise} promise for the fully realized component
		 */
		function realizeComponent(spec, name) {

			// Look for a factory, then use it to create the object
			return when(findFactory(spec),
				function (factory) {
					var component = defer();

					if (!spec.id) {
						spec.id = name;
					}

					factory(component.resolver, spec, pluginApi);

					return processComponent(component, spec, name);
				},
				function () {
					// No factory found, treat object spec as a nested scope
					return createScope(spec, scope, { name: name, createContext: createContext }).then(function(childScope) {
						return object.safeMixin({}, childScope.components);
					});
				}
			);
		}

		/**
		 * Move component through all phases of the component lifecycle up
		 * to ready.
		 * @param component {*} component or promise for a component
		 * @param spec {Object} component spec
		 * @param name {String} component name
		 * @return {Promise} promise for the component in the ready state
		 */
		function processComponent(component, spec, name) {
			return when(component, function(component) {

				return when(createProxy(component, spec), function(proxy) {
					return lifecycle.init(proxy);

				}).then(function(proxy) {
						// Components become resolvable after the initialization phase
						// This allows circular references to be resolved after init
						makeResolvable(name, proxy.target);
						return lifecycle.startup(proxy);

					}).then(function(proxy) {
						return proxy.target;

					});
			});
		}

		/**
		 * Select the factory plugin to use to create a component
		 * for the supplied component spec
		 * @param spec {Object} component spec
		 * @return {Promise} promise for factory, rejected if no suitable
		 *  factory can be found
		 */
		function findFactory(spec) {

			return getFactory() || when(modulesReady, function () {
				return getFactory() || when.reject(spec);
			});

			function getFactory() {
				var f, factories, factory;

				factories = pluginRegistry.factories;

				for (f in factories) {
					if (spec.hasOwnProperty(f)) {
						factory = factories[f];
						break;
					}
				}

				// Intentionally returns undefined if no factory found
				return factory;
			}
		}

		function createProxy(component, spec) {
			return when(modulesReady, function() {
				var componentProxy, id;

				componentProxy = pluginRegistry.proxiers.reduce(function(proxy, proxyHandler) {
					return proxyHandler(proxy) || proxy;
				}, proxy.create(component));

				componentProxy.spec = spec;
				if(spec) {
					id = spec && spec.id;
					componentProxy.id = id;
					componentProxy.path = createPath(id);
					proxiedComponents.push(componentProxy);
				}

				return componentProxy;
			});
		}

		/**
		 * Return a proxy for the component name, or concrete component
		 * @param nameOrComponent {String|*} if it's a string, consider it to be a component name
		 *  otherwise, consider it to be a concrete component
		 * @param {string} [onBehalfOf] name of component requesting the proxy
		 * @return {Object|Promise} proxy or promise for proxy of the component
		 */
		function getProxy(nameOrComponent, onBehalfOf) {
			return typeof nameOrComponent == 'string'
				? when(resolveRefName(nameOrComponent, {}, onBehalfOf), function (component) {
					return createProxy(component);
				})
				: createProxy(nameOrComponent);
		}

		//
		// Destroy
		//

		/**
		 * Destroy the current context.  Waits for the context to finish
		 * wiring and then immediately destroys it.
		 *
		 * @return {Promise} a promise that will resolve once the context
		 * has been destroyed
		 */
		function destroy() {
			return when(scopeReady, doDestroy, doDestroy);
		}

		//
		// Reference resolution
		//

		/**
		 * Resolves the supplied ref as a local component name, or delegates
		 * to registered resolver plugins
		 * @param ref {Object} reference object returned by resolver.parse or resolver.create
		 * @param scope {Object} scope for resolving local component names
		 * @param [onBehalfOf] {*} optional indicator of the party requesting the reference
		 * @return {Promise} a promise for the fully resolved reference value
		 */
		function doResolveRef(ref, scope, onBehalfOf) {
			return ref.resolver ? when(modulesReady, ref.resolve) : doResolveDeepRef(ref.name, scope);
		}

		/**
		 * Resolves a component references, traversing one level of "." nesting
		 * if necessarily (e.g. "thing.property")
		 * @param name {String} component name or dot-separated path
		 * @param scope {Object} scope in which to resolve the reference
		 * @return {Promise} promise for the referenced component or property
		 */
		function doResolveDeepRef(name, scope) {
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

		/**
		 * @param ref {*} any reference format supported by the registered resolver
		 * @param name {String} component name to which the the resolved value of the reference
		 *  will eventually be assigned.  Used to avoid self-circular references.
		 * @return {Promise} a promise for the fully resolved reference value
		 */
		function resolveRef(ref, name) {
			var scope;

			ref = resolver.parse(ref);
			scope = name == ref.name && parent.components ? parent.components : components;

			return doResolveRef(ref, scope, name);
		}

		/**
		 *
		 * @param refName {String} name of reference to resolve. Can be either a
		 *  component name, or a plugin-style reference, e.g. plugin!reference
		 * @param [options] {Object} additional options to pass to reference resolver
		 *  plugins if the refName requires a plugin to resolve
		 * @param [onBehalfOf] {*} optional indicator of the party requesting the reference
		 * @return {Promise} a promise for the fully resolved reference value
		 */
		function resolveRefName(refName, options, onBehalfOf) {
			return doResolveRef(resolver.create(refName, options), components, onBehalfOf);
		}

		/**
		 * Builtin reference resolver that resolves to the context-specific
		 * wire function.
		 * @param resolver {Object} resolver to resolve
		 */
		function wireResolver(resolver /*, name, refObj, wire*/) {
			resolver.resolve(wireApi);
		}

		//
		// Built-in Factories
		//

		/**
		 * Factory that creates either a child context, or a *function* that will create
		 * that child context.  In the case that a child is created, this factory returns
		 * a promise that will resolve when the child has completed wiring.
		 *
		 * @param {Object} resolver used to resolve with the created component
		 * @param {Object} spec component spec for the component to be created
		 * @param {function} wire scoped wire function
		 */
		function wireFactory(resolver, spec, wire) {
			//
			// TODO: Move wireFactory to its own module
			//
			var options, module, provide, defer, waitParent;

			options = spec.wire;

			// Get child spec and options
			if (typeof options == 'string') {
				module = options;
			} else {
				module = options.spec;
				waitParent = options.waitParent;
				defer = options.defer;
				provide = options.provide;
			}

			function init(context) {
				var initialized;

				if(provide) {
					initialized = when(wire(provide), function(provides) {
						object.safeMixin(context.components, provides);
					});
				}

				return initialized;
			}

			function createChild(/** {Object|String}? */ mixin) {
				var spec, config;

				spec = mixin ? [].concat(module, mixin) : module;
				config = { init: init };

				var child = wireChild(spec, config);
				return defer ? child
					: when(child, function(child) {
					return child.hasOwnProperty('$exports') ? child.$exports : child;
				});
			}

			if (defer) {
				// Resolve with the createChild *function* itself
				// which can be used later to wire the spec
				resolver.resolve(createChild);

			} else if(waitParent) {

				var childPromise = when(scopeReady, function() {
					// ensure nothing is passed to createChild here
					return createChild();
				});

				resolver.resolve(new ResolvedValue(childPromise));

			} else {
				when.chain(createChild(spec), resolver);

			}
		}

	} // createScope

	/**
	 * Special object to hold a Promise that should not be resolved, but
	 * rather should be passed through a promise chain *as the resolution value*
	 * @param val
	 */
	function ResolvedValue(val) {
		this.value = val;
	}

	/**
	 * If it is a PromiseKeeper, return it.value, otherwise return it.  See
	 * PromiseKeeper above for an explanation.
	 * @param it anything
	 */
	function getResolvedValue(it) {
		return it instanceof ResolvedValue ? it.value : it;
	}

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