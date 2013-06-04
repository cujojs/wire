# Extending wire.js with plugins

1. [Using plugins](#using-plugins)
	1. [Plugin options](#plugin-options)
	1. [Plugin namespaces](#plugin-namespaces)
1. [Authoring plugins](#authoring-plugins)
	1. [Plugin factory function](#plugin-factory-function)
	1. [Plugin instance](#plugin-instance)
	1. [Plugin API](#plugin-api)
	1. [Proxies](#proxies)

Wire.js can be extended via plugins.  Plugins can extend the DSL syntax with [factories](#factories), [facets](#facets), and [reference resolvers](#references), listen for component lifecycle events, and even provide [proxy adapters](concepts.md#proxies) that allow other plugins to interact with new types of components.

# Using plugins

Using plugins is easy: simply include each plugin's module id in the `$plugins` array in your wire spec:

```js
define({
	// Wire spec

	// other components here

	// Include the wire/dom and wire/on plugins, and perhaps your own
	// custom plugin
	$plugins: ['wire/dom', 'wire/on', 'my/custom/wirePlugin']
});
```

**NOTE:** Plugins are not inherited from parent contexts.  The primary reasons for this are simplicity, and explicitness.

For example, you might have a spec that gets wired as a child of many other specs (for example, perhaps the child represents a reusable widget, like a tab container). Some parent specs may already include the necessary plugins, and some may not. When you author the tab container spec, you may not be aware of all the possible parent specs, especially if another team or a 3rd party will be using it.  By explicitly providing the necessary plugins in your tab container spec, you are guaranteed it will work the way you intend.

Also, in that same situation, the parent spec may provide some or all of the necessary plugins, and they may overlap with plugins provided in the tab container spec.  In the future, we may introduce an algorithm for allowing this type of overlapping plugin inheritance, but for now, we have decided that it is simpler to explicitly include the necessary plugins.

## Plugin options

Some plugins accept options.  You can supply options by using an object literal in the `$plugins` array instead of a module id string:

```js
define({
	// Wire spec

	// other components here

	// Use an object literal to pass options to plugins.  You can mix
	// object literals and strings in $plugins.
	$plugins: [
		{ module: 'wire/debug', trace: true },
		'wire/dom',
		'wire/on',
		{ module: 'my/custom/wirePlugin', myPluginOption1: /* value */, myPluginOption2: /* value */ }
	]
});
```

## Plugin namespaces

By default, all the [factories](#factories), [facets](#facets), and [reference resolvers](#references) provided by each plugin are available *un-namespaced* within the current wire spec.  For clarity, and to avoid potential naming conflicts between plugins, you can *optionally* provide a namespace for some or all plugins in your wire specs, using the `$ns` option.

When namespaced, all of the [factories](#factories), [facets](#facets), and [reference resolvers](#references) provided by the plugin must be prefixed with the namespace.

The [Hello Wire example from the Concepts](concepts.md#context-example) assigns the namespace `dom` to the `wire/dom` plugin, and thus uses the plugin's `first!` resolver with the namespace prefix: `dom:first!`

```javascript
define({
	message: 'I haz been wired',

	// Create an instance of the hello-wired module.
	helloWired: {

		create: {
			module: 'app/HelloWire',
			// Use the first! resolver with namespace prefix
			args: { $ref: 'dom:first!.hello' }
		},

		ready: {
			sayHello: { $ref: 'message' }
		}
	},

	$plugins: [
		{ module: 'wire/debug', trace: true },
		// Assign the namespace `dom` to the wire/dom plugin
		{ module: 'wire/dom', $ns: 'dom' }
	]
});
```

# Authoring plugins

Wire plugins provide a powerful way to extend wire's capabilities, and to allow it to integrate with other environments, frameworks, and libraries.  For example, wire's core has no knowledge of jQuery UI Widgets or Dijit Widgets, but can create, configure, manage, and destroy them via the [jquery/ui](jquery.md#jquery-ui-widgets) and [dojo/dijit](../dojo/dijit.js) plugins.  Even [DOM querying](dom.md#querying-the-dom) and [DOM events](#connecting-dom-events) are handled via plugins.

Wire's rich plugin API allows developers to add a wide range of new functionality easily, while the core remains small and fast.

## Plugin factory function

A wire plugin is a module that defines a plugin factory function. For example, using AMD:

```js
define(function() {

	// The module is a plugin factory function which wire.js will execute
	// to create an instance of the plugin
	return function(options) {

		// options: plugin-specific options, if any, provided to the plugin instance
		// in the wire spec plugins declaration

		// Return an instance of your plugin
		return {
			// See below for plugin instance format
		};
	}

});
```

The plugin factory function can accept an options object, and must return a plugin instance.  Wire will invoke the plugin factory function to create a plugin instance before wiring the wire spec where the plugin is used.  The options object will contain [options specified in the wire spec](#plugin-options) where the plugin is used.

## Plugin instance

The plugin instance returned by the plugin factory function can provide lifecycle listeners, [factories](concepts.md#factories), [facets](concepts.md#facets), [reference resolvers](concepts.md#references), [proxies](concepts.md#proxies) and listeners for various points in [context](concepts.md#contexts) and [component lifecycles](concepts.md#component-lifecycle).  A plugin can define as much or as little of the following interface as it needs.

Here is the full interface a plugin instance can define.
```js
// return a plugin instance
function(options) {
	return {
		// Context lifecycle listeners
		// These functions will be invoked when a context is being created
		// by wiring a spec
		context: {
			initialize: function(resolver, wire) {},
			startup:    function(resolver, wire) {},
			ready:      function(resolver, wire) {},

			shutdown:   function(resolver, wire) {},
			destroy:    function(resolver, wire) {},

			// Called when an error occurs during wiring
			error: function(resolver, wire) {},
		}

		// Component lifecycle listeners
		// Each component declared in a wire spec will pass through these
		// functions as it moves through its lifecycle.
		create:     		 function(resolver, proxy, wire) {},
		'create:after':      function(resolver, proxy, wire) {},

		configure:  		 function(resolver, proxy, wire) {},
		'configure:before':  function(resolver, proxy, wire) {},
		'configure:after':   function(resolver, proxy, wire) {},

		initialize: 		 function(resolver, proxy, wire) {},
		'initialize:before': function(resolver, proxy, wire) {},
		'initialize:after':  function(resolver, proxy, wire) {},

		connect:    		 function(resolver, proxy, wire) {},
		'connect:before':    function(resolver, proxy, wire) {},
		'connect:after':     function(resolver, proxy, wire) {},

		ready:      		 function(resolver, proxy, wire) {},
		'ready:before':  	 function(resolver, proxy, wire) {},
		'ready:after':   	 function(resolver, proxy, wire) {},

		destroy:    		 function(resolver, proxy, wire) {},
		'destroy:before':  	 function(resolver, proxy, wire) {},
		'destroy:after':   	 function(resolver, proxy, wire) {},

		// Reference resolvers
		// Custom reference resolvers that will be called to resolve
		// references with the key names.  E.g. a reference like:
		// { $ref: 'resolver1!referenceId' }
		// will be resolved by resolver1 below
		resolvers: {
			resolver1: function(resolver, refName, refObj, wire) {},
			resolver2: function(resolver, refName, refObj, wire) {}
			// ... more resolvers ...
		},

		// Factories
		// Factories create components.  A factory will be invoked to create
		// a component when it's key is present in the component's wire spec:
		// myComponent: {
		//   factory1: // factory1 options
		//   ... more myComponent facets here ...
		// }
		// NOTE: Exactly 1 factory will be invoked for each component
		factories: {
			factory1: function(resolver, componentDefinition, wire) {}
			// ... more factories ...
		},

		// Proxies
		// Proxies wrap components to allow plugins to interact with them in
		// a generic and safe way.  Wire creates a base proxy for all components,
		// and these proxy functions may override and/or extend the base
		// proxy's behavior as needed.
		proxies: [
			proxyFunction1: function(baseProxy) {},
			// ... more proxy functions ...
		],

		// Facets
		// Facets add behavior to components.  A facet will be invoked for
		// a component when the facet's key is present in the component's wire
		// spec:
		// myComponent: {
		//   facet1: // facet1 options
		//   ... more myComponent facets here ...
		// }
		// A facet can touch a component at any lifecycle stage by defining
		// a method with the corresponding lifecycle stage name.  For example,
		// if a facet defines a 'configure' method, that method will be invoked
		// during the 'configure' stage for each component with the facet's key.
		facets: {
			facet1: {
				create:     		 function(resolver, proxy, wire) {},
				'create:after':      function(resolver, proxy, wire) {},

				configure:  		 function(resolver, proxy, wire) {},
				'configure:before':  function(resolver, proxy, wire) {},
				'configure:after':   function(resolver, proxy, wire) {},

				initialize: 		 function(resolver, proxy, wire) {},
				'initialize:before': function(resolver, proxy, wire) {},
				'initialize:after':  function(resolver, proxy, wire) {},

				connect:    		 function(resolver, proxy, wire) {},
				'connect:before':    function(resolver, proxy, wire) {},
				'connect:after':     function(resolver, proxy, wire) {},

				ready:      		 function(resolver, proxy, wire) {},
				'ready:before':  	 function(resolver, proxy, wire) {},
				'ready:after':   	 function(resolver, proxy, wire) {},

				destroy:    		 function(resolver, proxy, wire) {},
				'destroy:before':  	 function(resolver, proxy, wire) {},
				'destroy:after':   	 function(resolver, proxy, wire) {},
			}
			// ... more facets ...
		}
	}
}
```

## Plugin API

When wire invokes any of your plugin instance methods, it provides several parameters.  All methods receive a `resolver` and a `wire` instance.  Certain plugin methods also receive additional parameters.  All the parameters are documented below.

### `resolver`

Wire is a highly asynchronous environment, and your plugin may need to do some work asynchronously itself.  The `resolver` is an object with two methods that your plugin method uses to signal that it has completed its work successfully or has failed.

```js
{
	// Signals that your plugin method has completed its work successfully.
	resolve: function(),

	// Signals that your plugin method has failed
	// error - an optional error indicating why it failed
	reject: function(error)
}
```

See [below](#factory-parameters) for more information on the `resolver` parameter when implementing a factory plugin method.

**NOTE:** Wiring will timeout if your plugin method does not eventually call one of `resolver.resolve` or `resolver.reject`

### `wire(componentSpec)`

A [contextualized](wire.md#contextual-ness) `wire()` function that your plugin can use to wire a component into the current context.  Returns a promise for the wired component.

#### `wire.resolveRef(componentName)`

Resolves a [component reference](concepts.md#references) by name.  Returns a promise for the named component.

```js
var promiseForOtherComponent = wire.resolveRef(nameOfOtherComponent);
```

#### `wire.loadModule(moduleId)`

Load a module.  This delegates to the underlying platform's loader (e.g. AMD or CommonJS, etc.), and so provides an abstraction for loading modules without worrying about the particulars of the platform.

#### `wire.createChild(childWireSpec)`

Wire a complete [child context](concepts.md#context-hierarchy) of the current context.  Returns a promise for the child context.

#### `wire.getProxy(componentNameOrInstance)`

Gets a [proxy](concepts.md#proxies) for a component or any object.  When called with a component name, resolves the name to a component and returns the component's proxy.  When called with an object, attempts to create a new proxy using available plugins.  Returns a promise for the proxy.

#### `wire.addInstance(instance, name)`

Registers a component instance under the provided name.  The instance may then be [referenced](concepts.md#references) by the supplied `name`.  Wire *will not* pass the instance through the [component lifecycle](concepts.md#component-lifecycle).  That is, the `instance` will be registered under the supplied `name` as-is, without any additional processing.

#### `wire.addComponent(component, name)`

Registers a component instance under the provided name *and* passes the instance through the [component lifecycle](concepts.md#component-lifecycle), allowing it to be processed by plugins.  The instance may then be [referenced](concepts.md#references) by the supplied `name`.

### Reference resolver parameters

Additional parameters passed to reference resolver plugin methods.

#### `refName`

The remainder of the reference string following the `'!'` in a reference.  For example, if you create a plugin with a reference resolver named `myResolverPlugin`, and use it:

`{ $ref: 'myResolverPlugin!referenceNameHere' }`

when wire invokes your resolver plugin method, `refName` will be `'referenceNameHere'`.

#### `refObj`

The entire reference object.  This allows your resolver plugin method to accept additional options, if they are supplied in the reference object.  For example, if you create a plugin with a reference resolver named `myResolverPlugin`, and use it:

`{ $ref: 'myResolverPlugin!referenceNameHere', option1: 123, option2: 'xyz' }`

when wire invokes your resolver plugin method, `refObj` will be the object: `{ $ref: 'myResolverPlugin!referenceNameHere', option1: 123, option2: 'xyz' }`

### Factory parameters

Additional parameters passed to factory plugin methods.

#### `resolver`

When implementing a factory plugin method, you *must* supply the component (created by your factory) when calling `resolver.resolve`.

#### `componentDef`

A descriptor object containing information about the component the factory method is being asked to create.  It has the following properties:

* `options` - The right-hand side (r-value) that was provided to your factory in the wire spec.  Since plugins can be [namespaced](#plugin-namespaces), you should use the `options` property instead of attempting to extract this information from the `options.spec` property (see below).
* `spec` - The complete spec for the current component.  It should be considered read-only.

**Example**

```js
var myPlugin = {
	factories: {
		widget: function(resolver, componentDef, wire) {
			var options = componentDef.options;



			// Wire the options, so that any $refs are guaranteed to be fully
			// resolved, and any nested components will have been created.
			// Then create the widget and signal success, or signal failure
			// if something went wrong.

			wire(options)
				.then(function(wiredOptions) {
					// Create a new Widget using the resolved DOM Node
					var widget = new Widget(wiredOptions.node);

					return widget;
				})
				.then(resolver.resolve, resolver.reject);
		}
	}

	// ... other facets, resolvers, proxies, etc.

}
```

```js
theWidget: {
	// Use your widget factory to create theWidget, supplying a DOM Node
	widget: {
		node: { $ref: 'first!.the-widget' }
	}
}
```

### Facet parameters

Additional parameters passed to facet plugin methods.

#### `proxy`

A [proxy](concepts.md#proxies) for the component that your facet is being asked to process.  The proxy has methods for interacting with the component in a generic way, so that your facet can operate on a wide variety of components without needing to know details about them.  In cases where your facet needs access to specific details of the component, the proxy's `target` property is a reference to the actual component.

See [Proxy API](#proxy-api) for the complete proxy API specification.

## Proxies

If you are creating a wire plugin that deals with specialized types of components, for example widgets from a particular widget library, that have specialized APIs for getting and setting properties (rather than simply `widget.property = value`, e.g. [jQuery UI widgets](jquery.md#jquery-ui-widgets), [Dijit widgets](../dojo/dijit.js#L50), etc.), or require special treatment when being destroyed, implementing a wire proxy provides some important benefits:

1. It allows other facets to process these components in a generic way.  For example, the [properties facet](configure.md#properties) uses a component's proxy to set properties, and thus can correctly set properties of *any* component as long as a suitable proxy has been implemented.
1. It allows wire to manage the component's lifecycle fully by automatically, and correctly, destroying a component when the [context](concepts.md#contexts) in which it was created is destroyed.

### Proxy API

All wire proxies have the following API:

```js
{
	// Get the named property of the component
	get: function(propertyName) {},

	// Set the named property of the component to the supplied value
	set: function(propertyName, value) {},

	// Invoke the named method on the component, passing the supplied
	// Array of args
	invoke: function(method, args) {},

	// Destroy the component
	destroy: function() {},

	// Attempts to clone the component.  Options:
	// options.deep - if true, attempts to deep clone the component
	clone: function(options) {},

	// A direct reference to the actual component.
	target: *
}
```

### Implementing a proxy

To implement a proxy, you must implement a proxy specialization function in your plugin, and add it to the `proxies` array in your plugin factory function:

```js
function specializeProxy(baseProxy) {
	// Read on for what to do here
}

// ...

var myPlugin = {
	factories: {
		widget: function(resolver, componentDef, wire) {
			// As above in "Factory parameters" ...
		}
	},
	// ... other facets, resolvers, etc.

	// add proxy specialization function to proxies array
	proxies: [
		specializeProxy
	]
};
```

**NOTE:** Since `proxies` is an array, you may implement as many proxies as your plugin needs.

Your proxy specialization function will then typically do the following:

1. Import the `wire/lib/WireProxy` [module](../lib/WireProxy.js).  It provides a `WireProxy.extend()` method that allows you to create a specialized proxy from the `baseProxy`.
1. Test to see if `baseProxy.target` is the type of component for which your plugin should provide a specialized proxy.  You can use any test that uniquely identifies the type of components.  For example, the Dijit plugin [uses an `instanceof` to check](../dojo/dijit.js#L42) if a component is an instance of a Dijit `Widget`.
1. If the component is the type you care about, then use `WireProxy.extend(baseProxy, specializationsObject)` to create a specialized proxy and `return` it.
	* The `specializationsObject` may contain method overrides for any of the proxy interface methods.
1. If the component is *not* the type you care about, you can opt to return `undefined` (explicitly, or implicitly by simply not issuing a `return` statement), or by returning `basePlugin`.

Here is an example of a simple specialized wire proxy:

```js
var WireProxy = require('wire/lib/WireProxy');

function specializeProxy(baseProxy) {
	if(isCorrectTypeOfComponent(baseProxy.target)) {
		return WireProxy.extend(baseProxy, specializations)
	}
}

function isCorrectTypeOfComponent(component) {
	// Implement whatever test you need
}
```

### Proxy priority

A component proxy may be specialized more than once--that is, the baseProxy may be specialized by one plugin, and then further specialized again by another plugin.  Typically, you will not need to worry about priority when implementing a proxy, but in some cases you may need to ensure the order of proxy specialization.  In such cases, proxy specialization functions my be given a priority.

The priority is an integer from -99 to 99, and is used to sort proxy specialization order.  Lower numbers execute before higher numbers, thus higher numbers have less chance of being overridden.  If you don't specify a priority, it defaults to 0.

To specify a priority, simply add a `priority` property to the proxy specialization function.  For example:

```js
var WireProxy = require('wire/lib/WireProxy');

function specializeProxy(baseProxy) {
	if(isCorrectTypeOfComponent(baseProxy.target)) {
		return WireProxy.extend(baseProxy, specializations)
	}
}

// Override the default priority
specializedProxy.priority = 1;

function isCorrectTypeOfComponent(component) {
	// Implement whatever test you need
}
```

