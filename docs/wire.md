# Using wire.js

1. [As a module](#module)
	1. [AMD](#amd)
	1. [CommonJS](#commonjs)
1. [As an AMD plugin](#amd-plugin)
1. [As a factory](#factory)
1. [By injecting wire](#injecting-wire)

## Module

Wire can be used as a module in AMD or CommonJS environments.  You can [install it using one of the supported methods](get.md).

In either environment, wire is simply a function.

### AMD

Once you've installed wire into your AMD environment and configured your loader, you can load wire as you would any other module:

```js
// Using pure AMD
// List wire as a dependency
define(['wire'], function(wire) {
	// use wire()
});
```

```js
// Using AMD-wrapped CommonJS
define(function(require) {
	// Use the standard AMD local require to load wire
	var wire = require('wire');
});
```

### CommonJS

Similarly, once you've installed wire into your CommonJS environment, simply load it:

```js
var wire = require('wire');
```

## AMD plugin

Wire can be used as an AMD plugin in any AMD loader that supports the [AMD plugin API](https://github.com/amdjs/amdjs-api/wiki/Loader-Plugins), for example: [curl](https://github.com/cujojs/curl), [RequireJS](http://requirejs.org), and [Dojo](http://dojotoolkit.org).  This can be a very convenient way to bootstrap a front-end application.

Once you've installed wire into your AMD environment and configured your loader:

```js
// Assume app/main is the main wire spec that bootstraps the application
curl(['wire!app/main']);
```

You should concatenate all the modules of your app before deploying it to production.  Wire's AMD plugin supports AMD bundling via cujoJS's [cram](http://know.cujojs.com/downloads#alacarte).  Other people have reported success using Pieter Vanderwerff's [wire-rjs plugin](https://github.com/pieter-vanderwerff/wire/blob/rjs-build/builder/rjs.js), which should be placed in the wire/builder folder prior to running rjs.

For more examples of using wire as an AMD plugin to bootstrap applications, see the [Example Apps](introduction.md#example-apps)

## Factory

Wire can be used as a [factory](concepts.md#factories) from within a [wire spec](concepts.md#wire-specs) to wire other specs and use them as components.  This makes it easy to modularize applications into higher level units that can be packaged and tested independently.

Here is a simple example excerpt from a wire spec:

```js
// aComplexView is defined by its own wire spec that pulls together
// many components, e.g. html templates, css, internationalization files,
// and Javascript behavior, into a single component.
aComplexView: {
	wire: 'app/ComplexView/spec'
},

// an application-level controller that needs to interact with aComplexView
myController: {
	create: 'app/Controller',
	properties: {
		_view: { $ref: 'aComplexView' }
	}
},

// other components
```

[Go to the full documentation for the wire factory](components.md#wire)

## Injecting wire

Syntax: `{ $ref: 'wire!' }`

Sometimes it is convenient to use wire programmatically, and for some situations, such as bootstrapping, you can simply use wire as a module.  Unfortunately, this creates a dependency within your application code on wire.

One core principle of wire is that, beyond an initial bootstrap, your application code should never have a hard dependency on wire itself.  For example, your AMD business logic modules should never list wire as an AMD dependency.

Instead of loading wire as a module, you can inject it as a function using the `wire!` resolver.  This has several advantages:

1. The injected wire function is *contextual*.  More on this below.
1. It removes the hard dependency of loading wire as a module.  During testing you can simply use a fake/mock function instead.
1. Because it injects a function, your code is not dependent on an API name.  For example, if you inject wire as a property, you can name it whatever makes sense for your application.

Here is a simple example of injecting the contextual wire function in a wire spec:

```js
myController: {
	create: 'app/Controller',
	properties: {
		// Inject the contextual wire function as a property
		// You control the property name, so you can call this
		// whatever makes sense for your app.
		_loadApplicationSection: { $ref: 'wire!' }
	}
}
```

### Contextual-ness

The reference `{ $ref: 'wire!' }` resolves to a wire function that has been bound to the current [wire context](concepts.md#contexts).  It will wire new contexts as [children](concepts.md#context-hierarchy) of the current context.  This allows you to modularize your application at a high level, and manage the relationships between the components in these high level areas.