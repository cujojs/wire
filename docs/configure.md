# Configuring components

1. [Properties](#properties)
1. [Mixins](#mixins)
1. [Init methods](#init-methods)
1. [Ready methods](#ready-methods)
1. [Destroy methods](#destroy-methods)

After creating a component, wire moves the component through its [lifecycle](concepts.md#component-lifecycle).  During the *configure* lifecycle step, you can set properties on the component, and then during the *initialize* step that follows, you can invoke initialization methods to do further configuration, before [connections](connections.md) are made between components.

The final step of the lifecycle, *ready*, occurs after connections are made, and gives you a chance to invoke methods on the component, if necessary, to ensure it is ready to fulfill its responsibilities within the application.

# Properties

Use the `properties` [facet](concepts.md#facets) to set properties on a component after it has been created.  Properties can be any [simple type](components.md#simple-types), a component created by a [factory](components.md#factories), or a [reference](concepts.md#references) to an existing component in the same [wire context](concepts.md#contexts) or any [ancestor context](concepts.md#context-hierarchy) (parent, grandparent, etc.).

## Properties example

Here is a simple example of creating a component, and setting some of its properties:

```js
define({
	// Create an instance of an AMD module
	aComponent: {
		create: 'myapp/Controller',
		properties: {
			// Simple String
			name: 'myapp',
			// Create a nested componet
			restClient: {
				create: 'myapp/net/restClient',
				properties: {
					path: 'my/things'
				}
			}
			// Reference to another component by name
			mainView: { $ref: 'mainView' }
		}
	},

	// More components ...
});
```

## Mixins

The `mixin` [facet](concepts.md#facets) *introduces* properties to a component.  As in the traditional [AOP sense](http://en.wikipedia.org/wiki/Aspect-oriented_software_development#Concepts_and_terminology), the `mixin` facet non-invasively introduces behavior to a component.  If the component already has a property of a given name, the `mixin` facet will not overwrite it.  In other libraries, this is sometimes called "safe mixin".

Behavior is introduced to a component via one or more other components in an array as follows:

```js
myComposedThing: {
	create: 'aBaseThing',
	mixin: [
		{ $ref: 'aDecoratorThing' },
		{ $ref: 'anotherDecorator' }
		/*, etc... */
	]
}
```

### Short syntax

To introduce only one component, you may skip the array.  Since a component reference is implied, you may also skip the [`$ref`](concepts.md#references).

```js
myComposedThing: {
	create: 'aBaseThing',
	// shortcut for `[ { $ref: 'aDecoratorThing' } ]`
	mixin: 'aDecoratorThing'
}
```

# Init methods

Some components may require more configuration than just setting properties.  You may need to invoke a method on the component to set it in motion--e.g. fetch some startup data, start a polling loop, or compute some internal state *after* setting its properties, but *before* [connections](connections.md) are made.

Use the *init* facet to specify one or more methods to be invoked after its properties have been set.  You can also specify parameters to be passed, which can be any simple type, component, or reference.

## Init method example

```js
define({
	// Create an instance of an AMD module
	aComponent: {
		create: 'myapp/Controller',
		properties: {
			// ...
		},
		// Specify init methods
		init: {
			// Invoke aComponent.doInitStuff(1000, anotherComponent)
			doInitStuff: [1000, { $ref: 'anotherComponent' }]

			// More init methods if necessary ...
		}
	},

	// More components ...
});
```

## Init method shortcut example

If you need to specify a single init method that takes zero parameters, you can use the shortcut syntax.  For example, if the `doInitStuff` method accepted zero parameters:

```js
define({
	// Create an instance of an AMD module
	aComponent: {
		create: 'myapp/Controller',
		properties: {
			// ...
		},
		// Invoke aComponent.doInitStuff()
		init: 'doInitStuff'
	},

	// More components ...
});
```

# Ready methods

Ready methods are much like [init methods](#init-methods), but are invoked *after* [connections](connections.md) are made.  Thus, init and ready methods ensure your component can take action before or after connections, or both if necessary.

As with init methods, you can specify one or more methods to be invoked, and any parameters, after its connections have been made.

## Ready method example

```js
define({
	// Create an instance of an AMD module
	aComponent: {
		create: 'myapp/Controller',
		properties: {
			// ...
		},
		// Specify ready methods
		ready: {
			// When aComponent is ready, invoke
			// aComponent.doReadyStuff(anotherComponent)
			doReadyStuff: [{ $ref: 'anotherComponent' }]

			// More ready methods if necessary ...
		}
	},

	// More components ...
});
```

## Ready method shortcut example

When specifying a single ready method with zero parameters, you can use the same shortcut syntax as with an init method.

```js
define({
	// Create an instance of an AMD module
	aComponent: {
		create: 'myapp/Controller',
		properties: {
			// ...
		},
		// When aComponent is ready, invoke aComponent.doReadyStuff()
		ready: 'doReadyStuff'
	},

	// More components ...
});
```

# Destroy methods

In addition to init and ready methods, you can also specify methods to be invoked when a component is being [destroyed](concepts.md#component-lifecycle), to do any necessary cleanup, such as releasing resources used by the component, stopping timers, etc.

## Destroy Method example

```js
define({
	// Create an instance of an AMD module
	aComponent: {
		create: 'myapp/Controller',
		properties: {
			// ...
		},
		// Specify destroy methods
		destroy: {
			// When aComponent is being destroyed, wire will
			// invoke aComponent.doCleanup(...)
			doCleanup: [/* parameters as with init and ready */]

			// More ready methods if necessary ...
		}
	},

	// More components ...
});
```

## Destroy method shortcut example

When specifying a single destroy method with zero parameters, you can use the same shortcut syntax as with init and ready methods.

```js
define({
	// Create an instance of an AMD module
	aComponent: {
		create: 'myapp/Controller',
		properties: {
			// ...
		},
		// Invoke aComponent.doCleanup()
		ready: 'doCleanup'
	},

	// More components ...
});
```