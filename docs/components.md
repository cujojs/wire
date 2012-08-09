One of the main things you'll do when assembling any application, whether you're doing it programmatically in pure Javascript, or declaratively using wire, is to create instances of components--from primitive Javascript types, like Numbers and Strings, to more elaborate things like DOM-based views and Javascript controllers.

Wire provides a declarative, *extensible*, Domain Specific Language (DSL) for describing the components of your application.

**NOTE:** The examples use AMD module syntax, but wire also supports CommonJS module environments, such as Node and RingoJS.  In those environments, you can use equivalent CommonJS module syntax.

## Simple types

To "create" simple types (Strings, Numbers, Booleans, Dates, RegExps, and even Arrays), simply declare them.  For example, the following simple wire spec has 3 components, each of which is a basic Javascript type:

```js
define({

	// Each top-level key is the name of a component, which can be any valid
	// Javascript identifier, or any string, if quoted.  In other words, component
	// names are like variables--you can name them whatever you want.

	// A simple component that is just a string
	aComponentName: 'This is a component that is just a string',

	// Quoted component names work, but should be avoided unless absolutely necessary
	// This component is just a Number
	'a quoted component name': 123,

	// This component is just an Array of Numbers
	anotherComponentName: [1, 2, 3]

	// ... more components
});
```

## Creating Objects

For creating instances of more sophisticated components, such as Javascript objects that have a constructor, or begetting new instances from a prototype, wire uses [[factory plugins|factories]].  Wire includes 5 factories, and other plugins may provide additional factories.  The 5 included
are:

1. `module` - loads an AMD module
2. `create` - loads an AMD module, which should be a constructor or plain function,
   and invokes the constructor/function to create an instance
3. `prototype` - uses an existing object or component instance as a
   Javascript prototype, begetting a new component instance from it
4. `literal` - wire will not parse the right-hand side, but rather use it
   verbatim as a component
5. `wire` - recursively invokes wire on another wire spec

[[Full documentation on the included factories|factories]]

To create a component using a factory, declare a component as an object literal and include the factory name and options as a property.

```js
define({

	// Load an AMD module and use the module itself as the component
	aModule: {
		module: 'myapp/moduleid'
	},

	// Load the module myapp/Controller and invoke it as a constructor
	// to create an instance
	anInstance: {
		create: 'myapp/Controller'
	}

	// The create factory can also accept arguments, which it will pass
	// to the constructor.  The arguments are a plain Array of anything that
	// wire understands, such as primitive types (Numbers, Strings, etc.),
	// references ($ref, covered later), or other components
	// Load the module myapp/Controller and invoke it as a constructor
	// to create an instance, passing the supplied arguments
	anotherInstance: {
		create: {
			module: 'myapp/Controller',
			// Pass 4 arguments to the constructor: a Number, a String,
			// a reference to some other component, and a new instance
			// of another component.
			args: [
				123,
				"a string, too",
				{ $ref: 'someOtherComponentName' },
				{ create: 'myapp/anotherComponent' }
			]
		}
	},

	// The prototype factory allows you to beget new instances from a prototype
	// Create a new instance by begetting from an existing component, in this
	// case the component named 'anInstance'.
	// This can be extremely useful for creating one-off components.
	aComponentCreatedFromAPrototype: {
		prototype: { $ref: 'anInstance' }
	},

	// The literal factory can be useful when you need to create an object literal
	// that may contain DSL keywords, but you don't want wire to parse it.
	dontParseMe: {
		literal: {
			// Wire will NOT parse this.  If it contains DSL keywords, they will
			// not be processed.  In this case the component named 'dontParseMe'
			// will be whatever is inside these curly brances, without modification
		}
	}

});
```

The wire factory is a more advanced topic.  You can read its [[full documentation here|factories]]

In it's simplest form, the wire factory can be used to wire a child [[context|contexts]] of
the current context.

```js
define({
	
	// When given the module id of another wire spec, the wire factory will
	// wire the spec as a child of the current context.
	// The component named 'aChildSpec' will be a wire context
	aChildSpec: {
		wire: 'myapp/spec/another-spec'
	}

});
```