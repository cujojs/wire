# Connections

Any software system or application consists of components, and those components collaborate to do the really useful stuff.  Once you've [[created some things|create-things]], you will usually want to connect them together in various ways so that they can collaborate.

Similarly to [[factories]] used to [[create things]], wire uses plugin [[facets]] to apply new behavior to components after they have been created.  There are several facets that are used to make connections between components.  For example, you can connect a Javascript controller to DOM events on an HTML view.

Wire itself, plus its bundled plugins support 4 types of connections:

1. Dependency Injection - The simplest type of "connection".  Inject a reference to one component into another so you can call methods on it directly
1. DOM events - As you'd expect, when a DOM event happens, invoke a component's method(s) to handle it
2. Javascript to Javascript "events" - When a method is called on one component, automatically invoke a method on another component
3. Aspect Oriented Programming (AOP) advice - A more advanced form of Javascript to Javascript connection.  When a method is called on a component, invoke a method on another component before or after it.

Each of these type of connections can be useful in various situations, and picking what type of connection to use should be a part of designing your application architecture.

## Injection

**Plugins:** None needed

We may tend not to think of method calls as a type of connection between components, but it's probably the we use the most.  With wire you can inject properties into Javascript components so that they can invoke methods directly on one another:

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

Rather than setting properties, you may need to pass dependent components to a constructor when creating a component instance.  You can supply constructor parameters using the longer form of the [[create factory|factories]] and providing an array of arguments.

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

## DOM events

**Plugins:** wire/on, wire/dojo/on (uses dojo/on), wire/jquery/on (uses jQuery.on)

*Coming Soon*

## Javascript to Javascript

**Plugin:** wire/connect, wire/dojo/events (uses dojo.connect)

*Coming Soon*

## Aspect Oriented Programming (AOP)

**Plugin:** wire/aop

The wire/aop plugin lets you make Javascript to Javascript connections similar to wire/connect, but provides more connection types.  For example, you can have one method called before another, after another method returns, or after another method throws an exception.

```javascript
define({
	// Include the wire/aop plugin
	plugins: [
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
