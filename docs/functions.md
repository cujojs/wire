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

*AMD Example*

*Node Example*

To use this function as a component in a wire spec, use the [module factory](connections.md#module), which simply uses the module itself as the component:

*wire spec example*

## Functions that Create Functions

Because functions are first-class in Javascript, functions can create and return other functions.  This can be very useful in creating specialized functions for a particular situation.  Here is an example of a module that is a function which returns a new function:

*Module example*

In this case, instead of using the `module` factory, we can use the [create factory](connections.md#create) to call the module function, which in this case, *returns* the function we want to use as a component.

*wire spec example*

## Composing Functions

Function components can be composed together to create new function components.  

## Invoker Functions

*What to say here*

# Injecting Functions

Functions can be injected into other components in the same way that other parameters or properties can be injected.  This is an very powerful way to specialize components by injecting situation-specific method implementations into them.  For example, a component may provide a default implementation of a method, but you can overwrite it by injecting a function that is specialized for a particular situation.

*Code Example*

# Connecting to Functions

You can connect directly to functions when connecting DOM events, and when simple Javascript-to-Javascript connections, or even AOP connections.

*Code Example*

# Transform Connections

