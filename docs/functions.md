# Working with Functions

1. [Functions as Components](#functions-as-components)
	1. [Function Modules](#function-modules)
	1. [Functions that Create Functions](#functions-that-create-functions)
	1. [Composing Functions](#composing-functions)
	1. [Invoker Functions](#invoker-functions)
1. [Injecting Functions](#injecting-functions)
1. [Connecting to Functions](#connecting-to-functions)
1. [Transform Connections](#transform-connections)

Functions are first-class citizens in Javascript. Wire treats them as first-class citizens in an IOC environment as well, allowing you to use functions as components, inject them, connect to them, and use them to transform data as it flows through connections.

# Functions as Components

There are several ways to use functions as components.

## Function Modules

The simplest way to use a function as a component is to have a module that *is* a function.  This is simple in both AMD and Node-style extended CommonJS modules.  For example, here is a simple module that is a function:

```js
// my/app/doSomething
// AMD module that is a single function
define([...], function(...) {
	
	return function doSomething() {
		// Do something interesting
	};

});
```

And similarly in Node-style extended CommonJS:

```js
// my/app/doSomething
// Node-style module that is a single function
module.exports = function doSomething() {
	// Do something interesting
};
```

To use this function as a component in a wire spec, use the [module factory](connections.md#module), which simply uses the module itself as the component.  In this case, `myFunctionComponent` will be the `doSomething` function from one of the modules above.

```js
// In a wire spec
myFunctionComponent: {
	module: 'my/app/doSomething'
}
```

## Functions that Create Functions

Because functions are first-class in Javascript, functions can create and return other functions.  This can be very useful in creating specialized functions for a particular situation.  Here is an example of a module that is a function which returns a new function.  This example uses AMD module syntax, but could have just as easily been authored as a Node-style extende CommonJS module ([as above](#function-modules)).

```js
// my/app/configureDoSomething
define([], function() {
	
	return function configureDoSomething(options) {

		return function doSomething() {
			// Use options to do something
		};

	};
});
```

In this case, instead of using the `module` factory, we can use the [create factory](connections.md#create) to call the module function, i.e. `configureDoSomething`, which in this case, *returns* the function we want to use as a component.

```js
myFunctionComponent: {
	create: {
		module: 'my/app/configureDoSomething',
		args: {
			// options object properties here
		}
	}
}
```

## Composing Functions

Two or more function components can be composed together to create new function components using the `compose` factory.  For example, given the following two function modules:

```js
// my/app/doSomething
define([], function() {	
	return function doSomething(x) {
		// Do something with x
		return y;
	};
});

// my/app/doSomethingElse
define([], function() {	
	return function doSomethingElse(y) {
		// Do something with y
		return z;
	};
});
```

You can compose them to create a new function component:

```js
// wire spec
doSomething: {
	module: 'my/app/doSomething'
},

doSomethingThenSomethingElse: {
	// compose factory accepts an array of functions
	compose: [
		{ $ref: 'doSomething' },
		{ module: 'my/app/doSomethingElse' }
	]
}
```

Notice that each function in the array may be either a reference to a function component, or one that is loaded/created directly using `module` or `create` factory.  *Anything* that evaluates to a function can be used--for example, another function component that was also `compose`d!

The `doSomethingThenDoSomethingElse` component will be a function that is equivalent to:

```js
function doSomethingThenSomethingElse(x) {
	var y = doSomething(x);
	return doSomethingElse(y);
}
```

You can compose any number of functions this way, not just 2 as in the example above, as long as their inputs and outputs are compatible.

## Compose pipelines

The `compose` factory also provides a shorthand string syntax when the functions being composed are themselves components.

```js
// wire spec
doSomething: {
	module: 'my/app/doSomething'
},

doSomethingElse: {
	module: 'my/app/doSomethingElse'
},

doSomethingThenSomethingElse: {
	// compose factory accepts an array of functions
	compose: 'doSomething | doSomethingElse'
}
```

### Composing component methods

When using the string shorthand, it is also possible to compose component methods--their context will be preserved even when mixing component methods and plain functions in a single composition.

```js
// Let's say that aComponent is an object with a "doSomething" method
aComponent: {
	create: 'my/app/Controller'
	// ...
},

doSomethingElse: {
	module: 'my/app/doSomethingElse'
},

doSomethingThenSomethingElse: {
	// compose factory accepts an array of functions
	compose: 'aComponent.doSomething | doSomethingElse'
}
```

The `doSomethingThenDoSomethingElse` component will be a function that is equivalent to:

```js
function doSomethingThenSomethingElse(x) {
	var y = aComponent.doSomething(x);
	return doSomethingElse(y);
}
```

## Invoker Functions

*What to say here*

# Injecting Functions

Functions can be injected into other components in the same way that other parameters or properties can be injected.  This is an very powerful way to specialize components by injecting situation-specific method implementations into them.  For example, a component may provide a default implementation of a method, but you can overwrite it by injecting a function that is specialized for a particular situation.

*Code Example*

# Connecting to Functions

You can connect directly to functions when connecting DOM events, and when simple Javascript-to-Javascript connections, or even AOP connections.

*Code Example*

# Transform Connections

