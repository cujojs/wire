# Creating components

1. [Simple types](#simple-types)
1. [Application components](#application-components)
1. [Built-in factories](#built-in-factories)
	1. [module factory](#module)
	1. [create factory](#create)
	1. [compose factory](#compose)
	1. [literal factory](#literal)
	1. [wire factory](#wire)
	1. [prototype factory (deprecated)](#prototype)

Wire provides a declarative, *extensible*, Domain Specific Language (DSL) for describing the components of your application.

**NOTE:** The examples use AMD module syntax, but wire also supports CommonJS module environments, such as Node and RingoJS.  In those environments, you can use equivalent CommonJS module syntax.

# Simple types

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

# Application components

To create more sophisticated applications components, wire.js uses *Factory plugins*.  Factory plugins extend the wire spec DSL, and provide simple syntax for creating objects and functions from AMD modules.  Developers can implement new factory plugins to create other types of components.

Wire includes 5 built-in factories, and other plugins may provide additional factories.  The 5 included
are:

1. `module` - loads a module (AMD or CommonJS, depending on your environment)
2. `create` - creates objects using a constructor function, regular function, or by using Object.create.
3. `compose` - composes functions using a declarative syntax
4. `literal` - wire will not parse the right-hand side, but rather use it verbatim as a component
5. `wire` - recursively invokes wire on another wire spec

## Using factories

To create a component using a factory, declare a component as an object literal and include the factory name and options as a property.  Here are a few simple examples:

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
	}
});
```

# Built-in factories

## module

The module factory loads an AMD module, *but does not call it*.  The module is used directly as the component.

### Syntax
```javascript
myComponent: {
	module: 'my/app/ModuleA'
}
```

## create

The create factory loads an AMD module and uses it to create a component instance by calling the module either as a constructor using `new` or as a regular function, or by begetting a new instance if the module is an object.

### Full syntax

```javascript
myComponent: {
	create: {
		// Load my/app/ModuleA and call it as a constructor or function
		module: 'my/app/ModuleA',

		// Optional: Pass these args when calling my/app/ModuleA
		// If not supplied, module will be called with no args
		args: [arg1, arg2, arg3...],

		// Optional: You'll probably NEVER need this, srsly.
		// Force calling the module as a constructor using new.
		// See isConstructor Option Notes section below.
		isConstructor: true, // or false
	}
}
```

### Short Syntax
```javascript
// This shorter syntax loads my/app/ModuleA and calls it with no args
myComponent: {
	create: 'my/app/ModuleA'
}
```

### isConstructor option notes

The create factory uses a set of simple heuristics to determine automatically whether to call the module as a constructor using `new`, or as a regular function.

There is a situation where the heuristics will guess incorrectly.  If you have a module that returns a constructor function with an empty prototype, there is no reliable way to determine if that function is a constructor.  For example:

```javascript
define('my/app/ModuleWithConstructor', function() {

	// This is a constructor function, but has an empty prototype.
	// The create factory will guess incorrectly that this is a
	// regular function, and will call it without using new.
	//
	// Specify isConstructor: true to ensure it is called as a constructor
	//
	function ThisIsAConstructor() {
		this.name = "Bob";
	}

	//
	// Defining an empty prototype or no prototype at all will have the
	// same outcome.  In either case, isConstructor: true is the answer.
	//
	// ThisIsAConstructor.prototype = {};
	//

	return ThisIsAConstructor;
});
```

## compose

Functions are first-class citizens in wire.js.  For example, you can [use them as components](functions.md#functions-as-components).  The compose factory allows you to compose function components and component methods into new functions.

See [Composing Functions](functions.md#composing-functions) for more information on composing new functions with the compose factory.

## literal

It can be useful to have object literals in [wire specs](concepts.md#wire-specs) for various reasons, such as reference data or common configuration shared between several components.  Most times, object literals can be declared directly:

```javascript
// An object literal can be declared directly in a wire spec
myReferenceData: {
	name: "I'm an object literal",
	number: 10
	// ... more properties here
}
```

However, if your object literal has a property that is the name of a factory, wire.js will attempt to use that factory to create the component, instead of simply using the object literal.  For example:

```javascript
// An object literal can be declared directly in a wire spec
myReferenceData: {
	name: "I'm an object literal",
	number: 10,
	module: "Bob's module"
	// Oops, wire.js will try to use the module factory to load an AMD
	// module with the id "Bob's module"!
}
```

To solve this, use the literal factory.  The result will be a component named `myReferenceData` that has the four properties declared inside the `literal`.

```javascript
// An object literal can be declared directly in a wire spec
myReferenceData: {
	// Anything inside this literal will be used as-is
	literal: {
		name: "I'm an object literal",
		number: 10,
		// Using module here is ok, wire.js will not attempt to use
		// the module factory.
		module: "Bob's module"
		// This will also be used as-is.  The literal factory WILL NOT be
		// invoked again.
		literal: 'This is a literal string'
	}
}
```

**Note:** if you have a large config object that does not have any references, you should also use the `literal` factory. In older browsers (IE7) this can shave off upto 7000ms in parsing time (depending on the object size).

## wire

The wire factory provides a way of creating [child contexts](concepts.md#contexts).  This allows you to modularize your [wire specs](concepts.md#wire-specs) so that they can be mixed and matched.  It also allows you to modularize your application by wiring sections of your application into existence when needed, and destroying them once they are no longer needed.

The `defer` option (see below) provides an especially powerful mechanism for modularizing applications.

### Syntax

```javascript
// childContext will be a promise for the wired child context
childContext: {
	// Wire a my/child/spec as a child context of the current context
	wire: {
		// This is the module ID of the spec to be wired
		spec: 'my/child/spec',

		// Note that defer and waitParent are mutually exclusive.
		// If both are set to true, defer will win.

		// Wire the child immediately
		defer: false, /* default is false */

		// If true, don't allow the child to begin wiring until after the
		// parent has fully completed.
		waitParent: false, /* default is false */

		// Provide components to the child.
		provide: {
			aSpecialValue: 42,
			transform: { $ref: 'myTransform' }
		}
	}
}
```

### Short syntax

```javascript
// childContext will be a promise for the wired child context
childContext: {
	// Wire a my/child/spec as a child context of the current context
	// This is the module ID of the spec to be wired
	// By default, defer === false
	wire: 'my/child/spec'
}
```

### Why is childContext a Promise?

Due to the [parent-child relationship between contexts](concepts.md#contexts), a child cannot finish until its parent has finished wiring.  When using the wire factory, the *current* context is the parent.  Since it is *currently* being wired, it has not finished (obviously!), and the child context created by the wire factory cannot finish.  So the wire factory returns a promise for the child context.

So, to use components in the child context from the parent, you must wait for the promise to resolve.  The promise is a [CommonJS Promises/A](http://wiki.commonjs.org/wiki/Promises/A "Promises/A - CommonJS Spec Wiki") compliant promise, so you can use its then() method:

```javascript
childContext.then(function(wiredChildContext) {
	wiredChildContext.componentFromChildSpec.doSomething();
});
```

### waitParent option

**NOTE:** The `waitParent` and `defer` options are mutually exclusive.  If both are set to true, `defer` will win.

When the wire factory creates a child context, it will allow the child to begin wiring as soon as possible, while still maintaining guarantees about parent/child references.  However, the child may not finish until after the parent (See "Why is childContext a Promise", above).

Sometimes you may need to guarantee that the child will not even start wiring until after the parent has fully completed.  For example, you may need for some components in the parent to do some startup work, such as setting up application security options, before any of the components in the child are even created.  In those situations, set `waitParent: true`, and child wiring will be guaranteed not to start until after the parent has fully finished wiring.

### defer option

**NOTE:** The `waitParent` and `defer` options are mutually exclusive.  If both are set to true, `defer` will win.

Instead of wiring a child context immediately, the `defer` option creates a *function* that, when called, will wire the child context.

For example, you might choose to create a wire spec for the user preferences area of your application.  You might use the `defer` option to inject a function into a controller:

```javascript
myController: {
	// Load my/Controller and create an instance
	create: 'my/Controller',

	// Inject properties
	properties: {
		// startPrefs is a function that will wire 'my/specs/preferences'
		// and return a promise that resolves when wiring is done.
		startPrefs: {
			wire: {
				spec: 'my/specs/preferences',
				defer: true
			}
		}
		// ... more properties
	}
}
```

When myController is wired, its `startPrefs` property will be a function that, when called, will wire the `my/specs/preferences` spec into a child context and will return a (CommonJS Promises/A compliant) promise, which will resolve to the child context once wiring has finished.

The child context will have a `destroy()` method that can be used to destroy the child, and thus your app's preferences area.

The `startPrefs` function can be called any number of times, and each time it will wire a new child context.

### defer example

This example uses the wire factory and `defer` option to configure a controller to show and hide the User Prefs area of a simple app.  This is based on the [Simple Notes Demo app from Dojoconf 2011](https://github.com/briancavalier/notes-demo-dojoconf-2011).

First, let's create an AMD module for our controller.  Let's assume its `_handlePrefsOptionSelected` method handles a button click or menu selection and needs to show a User Prefs view.

```javascript
define(/* 'my/Controller', */ [], function() {

	// Simple constructor
	function MyController() {}

	MyController.prototype = {

		// Button or menu item handler that will be called when
		// the user clicks or selects User Prefs.
		_handlePrefsOptionSelected: function(e) {

			// Hang onto a this ref, since we'll be nesting functions.
			var self = this;

			// _showPrefs will have been injected, so we call it
			// to wire the prefs context.  This can bring the entire
			// prefs area of the app into existence.
			self._showPrefs().then(function(prefsContext) {

				// And set our controller's _hidePrefs method
				// to destroy the prefsContext, which will cleanup
				// everything that was created when it was wired.
				self._hidePrefs = function() {

					// Reset _hidePrefs to a noop in case someone
					// calls it.
					self._hidePrefs = noop;

					// Destroy the prefsContext
					prefsContext.destroy();
				}
			});
		},

		// Do-nothing show/hide methods, initially.
		// _showPrefs will be overwritten with an injected wire function.
		// _hidePrefs is overridden with a function to destroy the
		// wired prefs context as needed.
		_showPrefs: noop,
		_hidePrefs: noop,

		// ... Other controller methods, etc.
	};

	return MyController;

	function noop() {}

});
```

Now, let's create a [wire spec](concepts.md#wire-specs) that will construct an instance of our controller and setup the _showPrefs method using the wire factory.

```javascript
// Create our controller
myController: {

	// Shortcut create syntax
	create: 'my/Controller',

	// Set some properties, including the _showPrefs function
	properties: {

		// Whoah! Use the wire factory with the defer option to inject
		// a function that will launch the User Prefs area using
		// another wire spec!
		_showPrefs: { wire: { spec: 'my/specs/prefs-spec', defer: true } }

		// ... other properties
	}
}
```

Now, when the user clicks/selects User Prefs, the controller's `_showPrefs()` method will be called, and will wire the prefsContext into existence.

### provide option

Child contexts [inherit](concepts.md#context-hierarchy) components from their ancestors and may [reference](concepts.md#references) their ancestors' components as if they were declared in the child spec.  This is a great feature since it allows specs to be more modular.

However, it's not always feasible to assume that a spec will be provided a component *of a given name* via its ancestry.  For instance, if you create a spec that decorates a `<table>` element with grid-like behavior, you can't necessarily rely on a component generically named "table" in the ancestry.  What if there are two `<table>` elements you want to decorate?  You can't name them both "table".

The wire factory's `provide` option offers an alternative to inherited components.  It allows components to be injected into the child spec as it is being wired.  Each property of the `provide` option is injected as a component into the child spec.  It's a bit like providing named arguments to a function.

Using a grid decorator as an example, you could use `provide` to inject two "table" components for two separate components in a spec as follows:

```js
{
	aGrid: {
		wire: {
			spec: 'ui/decorators/grid',
			// inject aTable into this child
			provide: { table: { $ref: 'aTable' } }
		}
	},

	anotherGrid: {
		wire: {
			spec: 'ui/decorators/grid',
			// provide anotherTable into this child
			provide: { table: { $ref: 'anotherTable' } }
		}
	},

	aTable: { $ref: 'first!table.grid', at: 'main-container' },

	anotherTable: { $ref: 'first!table.grid', at: 'sidebar' }

	// other components and plugins...
}
```

Modular spec-modules like the grid decorator are often very configurable.  They might have dozens of configuration options.  However, having to provide all of those options for every instance would be tedious.

The `provide` option helps this situation by also overriding components declared in the *child* spec.  For instance, if our grid decorator spec declares a configuration value, such as `headerRows: 1`, we could override it in a parent's `provide` or just leave it as is.  The `headerRows: 1` in the grid decorator spec is the *default value*.

Here's how a grid decorator spec might look and how it could be consumed by another spec:

```js
// grid decorator spec, ui/decorators/grid.js
{
	// Table element to decorate. Must be provided.
	table: null,

	// Configuration value defaults.
	headerRows: 1,
	footerRows: 0,
	fixedColumns: 'auto',

	grid: {
		// pass configuration values to grid constructor
		create: {
			module: 'ui/decorators/grid/GridWidget',
			args: {
				headerRows: { $ref: 'headerRows' },
				footerRows: { $ref: 'footerRows' },
				fixedColumns: { $ref: 'fixedColumns' }
			}
		}
	},

	// other components and plugins...
}

// parent spec that uses ui/decorators/grid
{
	aGrid: {
		wire: {
			spec: 'ui/decorators/grid',
			// provide aTable and configuration options
			provide: {
				table: { $ref: 'aTable' },
				headerRows: 2,
				fixedColumns: 1
			}
		}
	},

	aTable: { $ref: 'first!table.grid', at: 'main-container' }

	// other components and plugins...
}
```

### Exporting specific components using `$exports`

By default, a component that uses the wire factory will be assigned the entire child context.  Therefore, other components may access or manipulate any part of the child context if they have a [reference](concepts.md#references) to the component.

For better encapsulation, child specs may limit the components they expose with the `$exports` keyword.  Before returning a child context to the parent, the wire factory looks for a component named `$exports` on the child context.  If it finds one, it will only export the `$exports` component to the parent, rather than the entire spec.

### $exports example

In the following example, only the `controller` component is exported to a parent context:

```js
{
	// $exports is a reference to controller. Only it will be exported.
	$exports: { $ref: 'controller' },

	controller: {
		create: 'MyController',
		properties: {
			view: { $ref: 'view' }
		}
	},

	view: { $ref: 'id!sidebar' }

	// other components and plugins...
}
```

Notice that the `view` component is still accessible to a parent context as a property of the `controller` component.  This is a reasonable pattern.  However, there are situations in which access to multiple, top-level components is desirable.

Multiple components may be exported at once by exporting an object or array.  In the following example, both `controller` and `view` are exported:

```js
{
	// An object with both "controller" and "view" properties will be exported.
	$exports: {
		controller: { $ref: 'controller' },
		view: { $ref: 'view' }
	},

	controller: {
		create: 'MyController',
		properties: {
			view: { $ref: 'view' }
		}
	},

	view: { $ref: 'id!sidebar' }

	// other components and plugins...
}
```

Note: when using wire [programmatically](wire.md#module) or injecting the [`wire!` reference resolver](wire.md#injecting-wire), `$exports` is ignored.  The entire context, including any `$exports` component, is returned.

## prototype

**Deprecated:** The prototype factory is deprecated in favor of simply using the [create factory](#create).

The prototype factory begets a new component from an existing component, using the Javascript prototype chain.  This is useful when you want to create several similar components.  You can create a base component, configure it, then beget several components from the base, and specialize their configuration as needed.

### Syntax

```javascript
// Create a component to use as a prototype.  See create factory above.
myBaseComponent: {
	create: 'my/app/ModuleA',
	// Set its properties
	properties: {
		firstName: 'Bob',
		lastName: 'Smith'
	}
},

// Beget a second component, using myBaseComponent as the prototype
myComponent1: {
	prototype: 'myBaseComponent',
	// Specialize the firstName, lastName will be 'Smith'
	properties: {
		firstName: 'John'
	}
},

// Beget another
myComponent2: {
	prototype: 'myBaseComponent',
	// Specialize the firstName, lastName will be 'Smith'
	properties: {
		firstName: 'Harry',
		// Can add new properties
		occupation: 'Javascript guy'
	}
}

// Can even beget from components that were themselves created using
// the prototype factory, to further specialize.
myComponent3: {
	prototype: 'myComponent2',
	// Specialize the firstName and occupation, lastName will still be 'Smith'
	properties: {
		firstName: 'Mary',
		occupation: 'Javascript gal',
		// And add a new property
		title: 'VP of Javascriptiness'
	}
}
```
