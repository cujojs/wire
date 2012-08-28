# Inversion of Control

Inversion of Control (IOC) is a general principle of software architecture, that can be applied in different ways.  The [Wikipedia article on IOC](http://en.wikipedia.org/wiki/Inversion_of_control "Inversion of control - Wikipedia, the free encyclopedia") says it is where "the flow of control of a system is inverted in comparison to procedural programming."

That's one of those definitions that's more useful after you already understand IOC, and not as useful when you're trying to figure it out in the first place.  It basically says that IOC is in effect in some form in any system where control is inverted from what is "normal" is.  But what is "normal"?

If you write Javascript in a browser environment, you're already using one form of IOC.  Let's look at a simple example to compare "normal" vs. "inverted" control.

### Normal Control

Take a simple *program*, like a shell script, that executes sequentially from beginning to end, maybe reading files, transforming the data, and then outputting the transformed data to stdout or another file.  This is the same as the concept of a "main()" in languages like C, C++, Java, etc.

That's a traditional, or "normal", flow of control.  Your code is in control and makes decisions (e.g. via conditionals, loops, etc.) about what code to execute when.

### Inverted Control

When you write Javascript in a browser, your code will typically be structured, at some level, as a set of callback functions attached to browser events.  You won't have a "main()", in the traditional sense, but rather, you rely on the browser to invoke your callback functions at the appropriate time.  The browser is in control, and makes decisions about when to give control back to your code by invoking your callback functions.  The browser may even decide *not* to call your callbacks at all, depending on the situation.

So, in a typical browser application, the main control is *inverted* and resides with the browser.  Your higher-level application code, is simply a collection of smaller chunks of code, callbacks, and the browser's lower-level main control loop drives the execution of your application.

Now you might be asking yourself "If I'm already doing IOC, why do I need wire.js?".  The example above is just one form of IOC.  Wire.js provides another important kind of IOC: *Dependency Inversion*.

# Dependency Inversion

[Dependency Inversion](http://en.wikipedia.org/wiki/Dependency_inversion_principle "Dependency inversion principle - Wikipedia, the free encyclopedia") is a pattern where concrete components do not directly depend on other concrete components, but rather on abstractions and APIs.  The concrete dependencies are provided, via a mechanism such as Depedency Injection (more info below) by the environment in which the components are used.

So, the "inversion" in this case, refers to how components' dependencies are satisfied.

This is probably a good time to go read [Martin Fowler's well known article on the subject](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for a more extensive explanation and examples.  [Jim Weirich's presentation from OSCON 2005](http://onestepback.org/articles/depinj/index.html "OSCON 2005 - Dependency Injection - Cover") is also an excellent introduction to both Dependency Inversion and Dependency Injection, and well worth reading.

*Side note*: The term IOC Container is usually a bit of a misnomer.  Most IOC Containers focus primarily on providing Dependency Inversion, and so a better name might be "Dependency Inversion Container".  Fowler mentions this as well.

### A Simple Example

Consider [Dojo's dojo/store package](http://dojotoolkit.org/features/1.6/object-store "Dojo Object Stores - The Dojo Toolkit"), which provides several types of data stores:

* JsonRest fetches data from REST endpoints
* Memory uses in-memory POJOs
* Observable decorates a store to provide notifications to listeners
* Cache decorates a store to provide basic caching

All the stores implement the same standard API: get(), put(), add(), and query().

Consider this implementation of a simple view that renders data from a Dojo JsonRest store.

```js
function PersonView() {
	this._datastore = new JsonRest({ target: "people/" });
}

PersonView.prototype = {
	render: function(node) {
		var people = this._datastore.query({…});
		people.forEach(function(person) {
			// Render each person into this.domNode
			node.innerHTML = …;
		});
	}
};
```

This raises several questions:

* How would you unit test it?
* Could you use this with another type of datastore?
* What if you want to use multiple instances of PersonView, each with a different type of datastore?  Or simply a different REST url target?

This implementation is tightly coupled to the implementation of JsonRest.  A better approach would be to rely on the Dojo store interface, rather than a particular concrete implementation, such as JsonRest.

```js
function PersonView(datastore) {
	this._datastore = datastore;
}

PersonView.prototype = {
	render: function(node) {
		var people = this._datastore.query({…});
		people.forEach(function(person) {
			// Render each person into this.domNode
			node.innerHTML = …;
		});
	}
};
```
This refactored implementation uses Dependency Inversion.  Instead of constructing its own datastore, it expects to be provided with one.  A unit test harness could supply a MemoryStore for easier unit testing, and the production code can supply a JsonRest.  It also allows multiple instances of PersonView to use different JsonRest instances (possibly pointed at different API urls), or even completely different datastore implementations.

