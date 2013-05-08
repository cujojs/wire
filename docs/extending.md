# Extending Wire.js

Wire.js can be extended via plugins.  Plugins can extend the DSL syntax with factories, facets, and reference resolvers, listen for component lifecycle events, provide proxy adapters that allow other plugins to interact with new types of components.

## Using plugins

## Authoring plugins

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

The plugin factory function should return a plugin instance.  Wire will invoke the plugin factory function to create a plugin instance before wiring the wire spec where the plugin is used.

### Plugin instance

The plugin instance returned can provide lifecycle listeners, [[Factories]], [[Facets]], reference resolvers and [[Reference|References]] resolvers.  A plugin can define as many or as few of these things as needed.

Here is the full format for everything a plugin instance can define:

```js
// return a plugin instance
wire$plugin: function(ready, destroyed, options) {
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
		create:     function(resolver, proxy, wire) {},
		configure:  function(resolver, proxy, wire) {},
		initialize: function(resolver, proxy, wire) {},
		ready:      function(resolver, proxy, wire) {},
		destroy:    function(resolver, proxy, wire) {},

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
				create:     function(resolver, proxy, wire) {},
				configure:  function(resolver, proxy, wire) {},
				initialize: function(resolver, proxy, wire) {},
				ready:      function(resolver, proxy, wire) {},
				destroy:    function(resolver, proxy, wire) {},
			}
			// ... more facests ...
		}
	}
}
```

### Plugin API

#### `wire`

#### `wire.resolveRef`

#### `wire.loadModule`

#### `wire.createChild`

#### `wire.getProxy`

#### `wire.addInstance`

#### `wire.addComponent`

#### `wire.resolver`