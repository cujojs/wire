1. [Configuring Components](#configuring-components)
1. [Properties](#properties)
	1. [Properties Example](#properties-example)
1. [Init Methods](#init-methods)
1. [Ready Methods](#ready-methods)

# Configuring Components

After creating a component, wire moves the component through its [lifecycle](docs/concepts.md#component-lifecycle).  During the *configure* lifecycle step, you can set properties on the component, and then during the *initialize* step that follows, you can invoke initialization methods to do further configuration, before [connections](docs/connections.md) are made between components.

The final step of the lifecycle, *ready*, occurs after connections are made, and gives you a chance to invoke methods on the component, if necessary, to ensure it is ready to fulfill its responsibilities within the application.

# Properties

Use the `properties` [facet](docs/concepts.md#facets) to set properties on a component after it has been created.  Properties can be any [simple type](docs/components.md#simple-types), a component created by a [factory](docs/components.md#factories), or a [reference](docs/concepts.md#references) to an existing component in the same [wire context](docs/concepts.md#contexts) or any [ancestor context](docs/concepts.md#context-hierarchy) (parent, grandparent, etc.).

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

# Init Methods

*Calling init methods, using the init facet*

# Ready Methods

*Calling ready methods, using the ready facet*