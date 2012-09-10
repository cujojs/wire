1. [Wire specs](#wire-specs)
1. [Contexts](#contexts)
1. [Components](#components)
1. [Factories](#factories)
1. [Component Lifecycle](#component-lifecycle)
1. [Facets](#facets)
1. [References](#references)
1. [Connections](#connections)

# Wire specs

Similar to declarative IOC containers for other platforms, such as Spring Framework for Java, wire has an *extensible* DSL.  The core DSL has a very simple form, and only a handful of top-level keywords.  The DSL can be extended by plugins.

Wire specs are *declarative*, and thus order does not matter.  Wire will process the spec in dependency order, regardless of how you choose to order components.  A typical best practice is to order your spec in a logical way, placing related components near each other, and optimizing for readability and understandability.

A wire spec is a Javascript object literal or JSON object that describes a set of [[components]].  Wire.js parses a wire spec as input and produces the fully realized set of components as output.

In their simplest form, components can be any simple Javascript type, such as Strings, Numbers, Arrays, etc., including RegExp and Date when the spec is a Javascript object literal.  More interestingly, components can be things such as AMD modules, constructors, or factory functions that wire.js can use to create instances of larger, more complex components of your application.

## Simple wire spec example

Here is the wire spec from the [Hello Wire](https://github.com/briancavalier/hello-wire.js) example.  You can read a complete walkthrough of this wire spec at the [Hello Wire github repo](https://github.com/briancavalier/hello-wire.js#readme)

```javascript
define({
	message: "I haz been wired",
	helloWired: {
		create: {
			module: 'hello-wired',
			args: { $ref: 'dom!hello' }
		},
		init: {
			sayHello: { $ref: 'message' }
		}
	},
	plugins: [
		{ module: 'wire/dom' }
	]
});
```

## Components

This simple wire spec has three top-level components:

* `message` - a String
* `helloWired` - an AMD module with module id `hello-wired`. In this case the [module is a constructor function](https://github.com/briancavalier/hello-wire.js/blob/master/js/hello-wired.js), which wire.js will use to create an object instance.
* `plugins` - an Array containing one AMD module to load.  This module happens to be a wire.js plugin for referencing DOM nodes--read more on referencing below and in the [[References]] section.

## References

The wire spec also contains two [[references]] using [JSON Referencing](http://www.sitepen.com/blog/2008/06/17/json-referencing-in-dojo/)*-like* syntax.  The first references a DOM Node by id:

```javascript
{ $ref: 'dom!hello' }
```

The second references the `messages` String (the first item in the wire spec):
```javascript
{ $ref: 'message' }
```

Wiring the spec
---------------

When you feed a wire spec to wire.js, it will create a [[Context|Contexts]] containing fully realized versions of the components in the spec.  In the Hello Wire case, the [[Context|Contexts]] will contain the message String, an *instance* of the `HelloWired` object from the `hello-wired` AMD module, and an Array with one element--the `wire/dom` plugin AMD module.

# Contexts

When you feed a [[spec|wire specs]] to wire.js as input, it produces a **context**.  The context is a Javascript Object that contains the all fully realized components that were specified in the wiring spec.  The context also has methods for wiring child contexts, resolving references, and destroying the context and all the objects, etc. that were created when it was wired.

## Context example

Let's look again at the simple wiring spec from the [Hello Wire](https://github.com/briancavalier/hello-wire.js) example.

```javascript
define({
	message: "I haz been wired",
	helloWired: {
		create: {
			module: 'hello-wired',
			args: { $ref: 'dom!hello' }
		},
		init: {
			sayHello: { $ref: 'message' }
		}
	},
	plugins: [
		{ module: 'wire/dom' }
	]
});
```

Using wire.js as an AMD plugin, we can wire the spec:

```javascript
require(['wire!hello-wired-spec'], function(context) {
	console.log(context);
	// Components are just properties of the wired context
	console.log(context.helloWired)
});
```

which creates the *context*, `context`, that contains fully realized components:

1. `message` - a String
2. `helloWired` - an object created from the AMD module `hello-wired`, whose constructor was passed a DOM node by the `wire/dom` plugin's DOM [[reference resolver|references]], and whose `init()` function has been called and passed the `message` String.
3. `plugins` - an Array containing a single wire.js plugin, `wire/dom`.

The `wired` context has properties for the components from the wiring spec.

## Context hierarchy

In wire.js, there is an implicit hierarchy of contexts, and there is a Root Context that is the ultimate ancestor of all the contexts you create.  This context hierarchy acts a lot like a Javascript prototype chain, in that a child contexts can see components from its parent context, can override them, and can have new components not in its parent.

Any context can be used to create a child by calling `context.wire(childSpec)`.  Here's an example using the `hello-wire.js` spec as the parent to create a child:

```javascript
// First, create the hello-wire context, same as above.
require(['wire!hello-wired-spec'], function(context) {
	console.log(context);
	
	// Use the context to wire a child
	context.wire({
		// Child context 
		anotherComponent: {
			// Create an instance by calling constructor with no args
			create: 'my/other/component',
			
			// Call anotherComponent.sayHowdy(message)
			// Message refers to the message String in the parent context
			init: {
				sayHowdy: { $ref: 'message' }
			}
		}
	}).then(function(childContext) {
		console.log(childContext);
		// The child can see components in its parent, similar to
		// a Javascript prototype
		console.log(childContext.helloWired);
		
		// But also has its own components
		console.log(childContext.anotherComponent);
		
		// The parent *cannot* see components in the child
		console.log(context.anotherComponent); // logs undefined
	});
});
```

The `childContext` will have properties for all the components in its parent `context`: `message`, `helloWired`, and `plugins`, but will also have the additional component `anotherComponent`.

# Components

One of the main things you'll do when assembling any application, whether you're doing it programmatically in pure Javascript, or declaratively using wire, is to create instances of components--from primitive Javascript types, like Numbers and Strings, to more elaborate things like DOM-based views and Javascript controllers.

Wire.js supports a wide variety of components from simple Javascript types, to object literals and Arrays, to AMD modules.

## Simple Types

A component can be any native Javascript type: Number, String, Boolean, Date, RegExp (via both new RegExp and literal // syntax), Array, Object literal.

[Read more about simple types](components.md#simple-types)

# Factories

In addition to simple types, wire uses *factories* to create more interesting components, such as AMD and CommonJS modules, object instances using constructors or `Object.create` (in an ES5 environment), functions, etc. 

[Read more about creating components](components.md#factories)

# Component Lifecycle

Each component in a [wire spec](#wire-specs) has a well-defined *lifecycle* that is managed by wire.js.  When wire.js processes the spec to create a [context](#contexts), each component will pass through the following lifecycle stages:

1. Create
1. Configure
1. Initialize
1. Connect
1. Ready
1. Destroy

During the Create stage, a [factory](#factories) creates the component instance.  Then, during each lifecycle stage (including Create), various [facets](#facets) will be applied to the instance.

When a context is destroyed by calling its `destroy()` method, the components will go through a final stage.  During the Destroy phase, [facets](#facets) can also be applied, although typically these will be specialized facets that help clean up the component and its resources.

# Facets

Facets allow you to apply additional configuration or behavior to a component after it has been created by a [factory](#factories).  For example, the `properties` facet sets properties on a component during the [Create lifecycle stage](#component-lifecycles), the `ready` facet invokes initializer methods on a component during the Ready stage, and the `connect` facet (provided by the `wire/connect` plugin) can connect components together allowing them to collaborate.

Wire.js comes with several builtin facets, and plugins can provide additional facets.

# References

References allow you to reference components and other existing resources.  Wire.js uses a [JSON-referencing](http://groups.google.com/group/json-schema/browse_thread/thread/95fb4006f1f92a40)-like syntax for references, but allows for extensions to the referencing syntax via [[plugins|plugin-format]], which can provide Reference Resolvers to do more sophisticated things, such as [[referencing DOM nodes|wire-dom]].

## Syntax

In their most simple form, references are a Javascript object with a single property `$ref`.  For example, the following reference refers to a component in the current [context](#contexts)(or any of its ancestors) whose name is `myComponent`.

```javascript
{ $ref: 'myComponent' }
```

When using plugin reference resolvers, the syntax is similar to [AMD loader plugin syntax](https://github.com/amdjs/amdjs-api/wiki/Loader-Plugins):

```javascript
{ $ref: 'resolver!reference-identifier' }
```

For example, the [wire/dom](https://github.com/cujojs/wire/wiki/wire-dom) plugin provides a reference resolver for referencing DOM nodes by id by providing a reference resolver named `dom`, whose reference identifier is a DOM node id.

```javascript
{ $ref: 'dom!my-node-id' }
```

## Simple Example

Using references in a [wire spec](#wire-specs) is similar to using variables.  For example, if you have a component named `controller` needs a reference to another component named `view`:

```javascript
// Create a controller instance
controller: {
	create: 'my/Controller',
	
	// Set controller properties
	properties: {
		// Set the controller's myView property to the view
		// instance created below
		myView: { $ref: 'view' }
		// ... other controller properties
	}
	// ... other controller configuration
},

// Create a view instance
view: {
	create: 'my/View',
	// ... other view configuration
}
```

Notice that order doesn't matter.  Even though `view` is referenced before it is declared, the reference will be resolved correctly because wire specs are *declarative*, and wire.js will handle ordering to make sure everything works out.

# Connections

...
