# Connections

1. [Connection types](#connection-types)
1. [Dependency Injection](#dependency-injection)
1. [DOM events](#dom-events)
1. [Javascript to Javascript](#javascript-to-javascript)
1. [Aspect Oriented Programming (AOP)](#aspect-oriented-programming-aop)
1. [Promise-aware AOP](#promise-aware-aop)
1. [Transform connections](#transform-connections)

Any software system or application consists of components that must collaborate to do the really useful stuff.  Once you've [created  components](./components.md), you can connect them together in various ways so that they can collaborate.

Similarly to [factories](./concepts.md#factories) used to [create components](./components.md#factories), wire uses plugin [facets](./concepts.md#facets) to apply new behavior to components after they have been created.  There are several facets that are used to make connections between components.  For example, you can connect a Javascript controller to DOM events on an HTML view.

# Connection types

Wire itself, plus its bundled plugins support 4 types of connections:

1. Dependency Injection - The simplest type of "connection".  Inject a reference to one component into another so you can call methods on it directly
1. DOM events - As you'd expect, when a DOM event happens, invoke a component's method(s) to handle it
1. Javascript to Javascript "events" - When a method is called on one component, automatically invoke a method on another component
1. Aspect Oriented Programming (AOP) advice - A more advanced form of Javascript to Javascript connection.  When a method is called on a component, invoke a method on another component before or after it.

Each of these type of connections can be useful in various situations, and picking what type of connection to use should be a part of designing your application architecture.

# Dependency Injection

**Plugins:** None needed

You may tend not to think of method calls as a type of connection between components, but it's probably the one you use most often.  With wire you can inject properties into Javascript components so that they can invoke methods directly on one another:

```js
define({
	// Create a component for my application, perhaps a datastore
	datastore: {
		create: //...
	},

	// Create another component, say, a controller
	controller: {
		create: 'my/app/Controller'
		// Give the controller a reference to the datastore, by
		// simply setting a property on it.
		properties: {
			// this controller instance will be able to reference
			// the datastore via this._myDatastore, and can call
			// methods on it directly
			_myDatastore: { $ref: 'datastore' }
		}
	}
});
```

Rather than setting properties, you may need to pass dependent components to a constructor when creating a component instance.  You can supply constructor parameters using the longer form of the [create factory](./components.md#create) and providing an array of arguments.

For example, if the controller in the example above accepted a datastore via its constructor:

```js
define({
	// Create a component for my application, perhaps a datastore
	datastore: {
		create: //...
	},

	// Create another component, say, a controller
	controller: {
		create: {
			module: 'my/app/Controller',
			// Give the controller a reference to the datastore, by passing
			// it to the controller's constructor.
			args: [
				{ $ref: 'datastore' }
			]
		}
	}
});
```

# DOM events

**Plugins:** wire/on, wire/dojo/on (uses dojo/on), wire/jquery/on (uses jQuery.on)

Wire supports connecting component methods to DOM events via its DOM plugins.  These plugins allow you to use CSS selectors to connect DOM events to component methods.  You can use wire/on to connect to DOM events on any DOM node that you create or reference.

For more info on creating, referencing DOM Nodes in wire, see [Working with DOM Nodes](dom.md).

## DOM event examples

This example connects to the `click` events of links and buttons within a node that is grabbed using a [DOM reference resolver](dom.md#querying-the-dom).

```js
define({
	$plugins: [
		{ module: 'wire/on' },
		{ module: 'wire/dom' },
	    // other plugins ...
	],

	// Get a reference to the first node with the class 'some-class'
	domNode: { $ref: 'first!.some-class' },

	component1: {
		create: // ...
		on: {
			// Whenever the user clicks a link or a <button>
			// within domNode, call component1.doSomething
			domNode: {
				'click:a,button': 'doSomething'
			}
		}
	}
});
```

Similarly, connecting to events within a DOM node created using the [render factory](dom.md#render-factory).

```js
define({
	$plugins: [
		{ module: 'wire/on' },
		{ module: 'wire/dom' },
		{ module: 'wire/dom/render' },
	    // other plugins ...
	],

	// Render a template. domNode will be the top-level
	// node of the rendered template
	domNode: {
		render: {
			template: { module: 'text!my-view/template.html' }
		}
	},

	component1: {
		create: // ...
		on: {
			// Whenever the user clicks a link or a <button>
			// within domNode, call component1.doSomething
			domNode: {
				'click:a,button': 'doSomething'
			}
		}
	}
});
```

When you have components that are DOM nodes, for example, those created using the [render factory](dom.md#render-factory), connections can be made in either direction.  In this example, connections are specified on the DOM node component.

```js
define({
	$plugins: [
		{ module: 'wire/on'},
	    // other plugins ...
	],

	// Render a template. domNode will be the top-level
	// node of the rendered template
	domNode: {
		render: {
			template: { module: 'text!my-view/template.html' }
		},
		on: {
			// Whenever the user clicks a link or a <button>
			// within domNode, call component1.doSomething
			'click:a,button': 'component1.doSomething'
		}

	},

	component1: {
		create: // ...
	}
});
```

## Injecting the `on` facet as a function

The function that powers the `on` facet may be [injected](concepts.md#dependency-inversion) into your components directly.  This allows you to use the exact same event handling code in your wire specs and your procedural code.  To obtain this function, use the `on!` [reference resolver](concepts.md#references).  The `on!` resolver will return a function that generates event handlers.

When used without a reference identifier (the part after the "!"), the `on!` facet will return a function that takes a node, an event name, an event handler, and an optional CSS selector to target child nodes: `function on (node, event, handler, selector) {}`.  This function works similarly to jQuery's `on` and dojo's `on` functions.

```js
// injecting the `on!` facet in a wire spec
myComponent: {
	create: 'MyComponent',
	properties: {
		on: { $ref: 'on!' }
	},
	init: 'init'
}

// using the `on!` facet in myComponent
MyComponent.prototype.init = function () {
	// listen for mouseover events on all A elements with the 'jit' class
	this.on(document, 'mouseover', this.onMouseOver.bind(this), 'a.jit');
}
```

When used with a event-selector string as the reference identifier, the `on!` resolver will return a function that takes fewer parameters.  You just supply an optional node parameter (default is the document) and an event handler.  The event names and the CSS selector are pre-configured and are automatically applied.

```js
// injecting the `on!` facet in a wire spec
myComponent: {
	create: 'MyComponent',
	properties: {
		on: { $ref: 'on!mouseover:a.jit' }
	}
}

// using the `on!` facet inside myComponent
// the mouseover event and the 'a.jit' selector have been pre-configured
// document is the default, so it is not required
this.on(/* document, */ this.onMouseOver.bind(this));
```

# Javascript to Javascript

**Plugin:** wire/connect, wire/dojo/events (uses dojo.connect)

These plugins allow you to make simple Javascript to Javascript connections.  You can specify that when a method on one component is called, a method on another component will also be called.  This allows any method to act as an event emitter without having to mixin an event emitter object.

```js
define({
	$plugins: [
		{ module: 'wire/connect'},
	    // other plugins ...
	],

	component1: {
		create: // ...
	},

	component2: {
		create: // ...
		connect: {
			// Whenever component2's doSomething method is
			// called, component1.doSomethingAlso will also
			// be invoked, with the same parameters.
			'doSomething': 'component1.doSomethingAlso'
		}
	}
});
```

Connections can be made in either direction.  For example, the following example is equivalent to the previous:

```js
define({
	$plugins: [
		{ module: 'wire/connect'},
	    // other plugins ...
	],

	component1: {
		create: // ...
		connect: {
			// Whenever component2.doSomething is called,
			// component1.doSomethingAlso will also
			// be invoked, with the same parameters.
			'component2.doSomething': 'doSomethingAlso'
		}
	},

	component2: {
		create: // ...
	}
});
```

# Aspect Oriented Programming (AOP)

**Plugin:** wire/aop

The wire/aop plugin lets you make Javascript to Javascript connections similar to wire/connect, but provides more connection types.  For example, you can have one method called before another, after another method returns, or after another method throws an exception.

```js
define({
	// Include the wire/aop plugin
	$plugins: [
	    { module: 'wire/aop' },
	    // other plugins ...
	],

	component1: {
		create: //...
	},

	component2: {
	    create: //...
	    before: {
	        // This will call component1's doSomethingBefore method
	        // before component2's doSomething method.  The parameters passed
	        // to component2.doSomething will be passed to
	        // component1.doSomethingBefore
	        doSomething: 'component1.doSomethingBefore'

	        // Can add multiple methods here
	        doSomethingElse: 'component1.doSomethingElseBefore'
	    }

	    // Similarly for other advice types
	    afterReturning: {
	        // component1.doSomethingAfterReturning will be invoked after
	        // component2.doSomething returns (but not if it throws, see
	        // afterThrowing below).  The return value of component2.doSomething
	        // will be passed to component1.doSomethingAfterReturning
	        doSomething: 'component1.doSomethingAfterReturning'
	    },

	    afterThrowing: {
	        // component1.handleError will be invoked after component1.doSomething,
	        // but only if it throws.  The exception thrown by component2.doSomething
	        // will be passed to component1.handleError
	        doSomething: 'component1.handleError'
	    },

	    after: {
	        // component1.alwaysDoSomethingAfter will be invoked after
	        // component2.doSomething regardless of whether it returns normally
	        // or throws.  The return value OR exception of component2.doSomething
	        // will be passed to component1.alwaysDoSomethingAfter
	        doSomething: 'component1.alwaysDoSomethingAfter'
	    }
	}
})
```

# Promise-aware AOP

Because Javascript is a highly asynchronous platform, it can be difficult or impossible to use standard after, afterReturning, and afterThrowing AOP advice.

Promises are a powerful alternative to the messy nested callback approach.  By using promises, your functions and methods can *return a promise* that represents the eventual value of an asynchronous operation.

You can read more about promises on the [cujojs/when wiki](https://github.com/cujojs/when/wiki).

Wire uses [when](http://github.com/cujojs/when) to provide *promise-aware* AOP advice that can be applied to asynchronous functions and methods that may return a promise.  The promise-aware advice types are close analogs of their standard AOP counterparts:

* afterFulfilling - like afterReturning, executing only after a returned promise is fulfilled successfully.
* afterRejecting - like afterThrowing, executing only after a returned promise is rejected.
* after - After advice is always promise aware, and handles both regular return/throw or promises.  It executes after a returned promise is *either* fulfilled or rejected.

## Promise-aware AOP examples

```js
define({
	// Include the wire/aop plugin
	$plugins: [
	    { module: 'wire/aop' },
	    // other plugins ...
	],

	component1: {
		create: //...
	},

	component2: {
	    create: //...

	    // Promise-aware advice types
	    afterFulfilling: {
	        // component1.doSomethingAfterReturning will be invoked
	        // after the promise returned by component2.doSomething
	        // resolves successfully (but not if it rejects). The
	        // resolution value of the promise will be passed to
	        // component1.doSomethingAftefResolving
	        doSomething: 'component1.doSomethingAftefResolving'
	    },

	    afterRejecting: {
	        // component1.handleError will be invoked after the
	        // promise returned by component2.doSomething
	        // rejects (but not if it resolves successfully). The
	        // rejection reason of the promise will be passed to
	        // component1.handleError
	        doSomething: 'component1.handleError'
	    },

	    after: {
	        // component1.alwaysDoSomethingAfter will be invoked
	        // after the promise returned by component2.doSomething
	        // regardless of whether it resolves successfully or
	        // rejects.  The resolution value or the rejection
	        // reason will be passed to component1.alwaysDoSomethingAfter
	        doSomething: 'component1.alwaysDoSomethingAfter'
	    }
	}
})
```
# Transform connections

Connections can transform the data that flows through them.  This allows you to write components without including data transformation logic.  They can expect to receive only the data format they really need, and you use a connection to transform data into the expected format.

To do this, you use the [function pipeline](functions.md#compose-pipelines) string syntax to feed data through one or more transformation functions before sending it on to a component method.

## Short transform connections example

This is simple example of how to use a function pipeline in a connection.  [Below](#component-transform-connections-example) is a more detailed example.

Imagine a simple shopping cart controller that has an `addItem` method that should be called to add an item when a button is clicked:

```js
// wire spec
// A DOM container in which we'll attach events.
// See "on" in controller
itemList: { $ref: 'first!.item-list'},

// A function that takes a DOM event and returns the
// item to add to the shopping cart. This encapsulates
// the algorithm for finding an item given an event.
findItem: { module: 'myApp/data/findItemFromEvent' }

// Shopping cart controller with an addItem(item) method
// Using a function pipeline allows separation of the
// algorithm for finding the item given a DOM event, and
// actually adding it.
controller: {
    create: 'myApp/Controller',
    on: {
        itemList: {
            'click:button.add': 'findItem | addItem'
        }
    }
}
```

## Component transform connections example

Assume a simple shopping cart controller that has an `addItem` method for adding items to the cart when a button is clicked.

```js
function Controller() {}

Controller.prototype = {
    addItem: function(domEvent) {
        // How to find the item data, in order to add it?
    }
}
```

### Coupled parameters

This is not ideal. Controller receives a DOM event, but must locate the associated item.  To do that, the Controller needs to understand the DOM event, and probably also the DOM structure in order to traverse the dom to find a data id or hash key stored in a DOM attribute.

It also means that the DOM event and that DOM structure must be mocked in order to unit test the Controller.

Controller only really cares about the item.

### Refactor

We can refactor the controller to care only about the item.  Note that this also makes unit testing the Controller easier, since you no longer need to mock the DOM event or the DOM structure.

```js
function Controller() {}

Controller.prototype = {
    addItem: function(item) {
        // Just add it
    }
}
```

### Create a transform function

Then, we can create a [function module](functions.md#function-modules) that encapsulates the algorithm for finding item data given a DOM event.

This function can be unit tested separately, and reused across the application, if necessary.

```js
define(function() {

    // Encapsulate the work of finding the item
    return function findItemFromEvent(domEvent) {
        // Find the item, then
        return item;
    }

});
```

### Putting it together

Finally, we can use a function pipeline to transform the DOM event into an item, and then pass the item on to the Controller's `addItem` method.

This removes any knowledge of the DOM event and DOM structure from the Controller.  It only needs to know how to add the item.

    itemList: { $ref: 'first!.item-list'},

    findItem: { module: 'myApp/data/findItemFromEvent' }

    controller: {
        create: 'myApp/Controller',
        on: {
            itemList: {
                'click:button.add': 'findItem | addItem'
            }
        }
    }

## Benefits of transform connections

To reiterate, the benefits of using a transform connection in the [example above](#component-transform-connections-example) are:

* Controller is easier to unit test
* Algorithm for finding the thing
    * can also be unit tested separately and more easily
    * can be changed separately from Controller
    * can be reused in other parts of the app

