1. [Inversion of Control](#inversion-of-control)
1. [Dependency Inversion](#dependency-inversion)
1. [Application Composition](#application-composition)
1. [Wire specs](#wire-specs)
1. [Contexts](#contexts)
1. [Components](#components)
1. [Factories](#factories)
1. [Component Lifecycle](#component-lifecycle)
1. [Facets](#facets)
1. [References](#references)
1. [Connections](#connections)

# Inversion of Control

Inversion of Control (IOC) is a general principle of software architecture, that can be applied in different ways.  The [Wikipedia article on IOC](http://en.wikipedia.org/wiki/Inversion_of_control "Inversion of control - Wikipedia, the free encyclopedia") says it is where "the flow of control of a system is inverted in comparison to procedural programming."

That's one of those definitions that's more useful after you already understand IOC, and not as useful when you're trying to figure it out in the first place.  It basically says that IOC is in effect in some form in any system where control is inverted from what is "normal" is.  But what is "normal"?

If you write Javascript in a browser environment, you're already using one form of IOC.  Let's look at a simple example to compare "normal" vs. "inverted" control.

## Normal Control

Take a simple *program*, like a shell script, that executes sequentially from beginning to end, maybe reading files, transforming the data, and then outputting the transformed data to stdout or another file.  This is the same as the concept of a "main()" in languages like C, C++, Java, etc.

That's a traditional, or "normal", flow of control.  Your code is in control and makes decisions (e.g. via conditionals, loops, etc.) about what code to execute when.

## Inverted Control

When you write Javascript in a browser, your code will typically be structured, at some level, as a set of callback functions attached to browser events.  You won't have a "main()", in the traditional sense, but rather, you rely on the browser to invoke your callback functions at the appropriate time.  The browser is in control, and makes decisions about when to give control back to your code by invoking your callback functions.  The browser may even decide *not* to call your callbacks at all, depending on the situation.

So, in a typical browser application, the main control is *inverted* and resides with the browser.  Your higher-level application code, is simply a collection of smaller chunks of code, callbacks, and the browser's lower-level main control loop drives the execution of your application.

Now you might be asking yourself "If I'm already doing IOC, why do I need wire.js?".  The example above is just one form of IOC.  Wire.js provides another important kind of IOC: *Dependency Inversion*.

# Dependency Inversion

[Dependency Inversion](http://en.wikipedia.org/wiki/Dependency_inversion_principle "Dependency inversion principle - Wikipedia, the free encyclopedia") is a pattern where concrete components do not directly depend on other concrete components, but rather on abstractions and APIs.  The concrete dependencies are provided, via a mechanism such as Depedency Injection (more info below) by the environment in which the components are used.

So, the "inversion" in this case, refers to how components' dependencies are satisfied.

This is probably a good time to go read [Martin Fowler's well known article on the subject](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for a more extensive explanation and examples.  [Jim Weirich's presentation from OSCON 2005](http://onestepback.org/articles/depinj/index.html "OSCON 2005 - Dependency Injection - Cover") is also an excellent introduction to both Dependency Inversion and Dependency Injection, and well worth reading.

*Side note*: The term IOC Container is usually a bit of a misnomer.  Most IOC Containers focus primarily on providing Dependency Inversion, and so a better name might be "Dependency Inversion Container".  Fowler mentions this as well.


# Application Composition

Implementing application logic inside components, and composing those components together into a running application are very different activities.  Many times, however, they are done at the same time, in the same code.  That leads to tightly coupled components that can be impossible to unit test and refactor.

Separating the process of implementing component logic from application composition has some significant benefits:

1. It decouples components from each other, making them easier to test and refactor.
1. It decouples components from the connection mechanisms, making it easier to change the type of connection (method call, pubsub, advice-based, sync vs. async, etc.) between them. It also means that the connection mechanism need not be involved in unit testing the component’s logic.
1. Having a designated spot for composition gives developers a place to look to understand the overall structure of an application

wire.js is cujo.js’s application composition layer.  It provides a well-defined place for creating, configuring, and connecting together the components of an application, or a chunk of an application. It provides infrastructure for connecting components together non-invasively.

Components can be implemented and tested without embedding connection logic and infrastructure.  The composition and application logic can be refactored independently, many times without affecting each other at all.

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
