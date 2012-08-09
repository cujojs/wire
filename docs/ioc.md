Inversion of Control
--------------------

Inversion of Control (IOC) is a general principle of software architecture, that can be applied in different ways.  The [Wikipedia article on IOC](http://en.wikipedia.org/wiki/Inversion_of_control "Inversion of control - Wikipedia, the free encyclopedia") says it is where "the flow of control of a system is inverted in comparison to procedural programming."

That's one of those definitions that's more useful after you already understand IOC, and not as useful when you're trying to figure it out in the first place.  It basically says that IOC is in effect in some form in any system where control is inverted from what is "normal" is.  But what is "normal"?

If you write Javascript in a browser environment, you're already using one form of IOC.  Let's look at a simple example to compare "normal" vs. "inverted" control.

### Normal Control Example

Take a simple *program*, like a shell script, that executes sequentially from beginning to end, maybe reading files, transforming the data, and then outputting the transformed data to stdout or another file.  This is the same as the concept of a "main()" in languages like C, C++, Java, etc.

That's a traditional, or "normal", flow of control.  Your code is in control and makes decisions (e.g. via conditionals, loops, etc.) about what code to execute when.

### Inverted Control Example

When you write Javascript in a browser, your code will typically be structured, at some level, as a set of callback functions attached to browser events.  You won't have a "main()", in the traditional sense, but rather, you rely on the browser to invoke your callback functions at the appropriate time.  The browser is in control, and makes decisions about when to give control back to your code by invoking your callback functions.  The browser may even decide *not* to call your callbacks at all, depending on the situation.

Timeouts and intervals are similar, in that the browser invokes timeout and interval callbacks as a part of the same main control loop as other event callbacks, and may delay their execution when necessary.

In both event callbacks, and timeouts/intervals, the main control is of your "program" is *inverted* and resides with the browser.  Your "program", the higher-level application code, is simply a collection of smaller chunks of code, callbacks, and the browser's lower-level main control loop drives the execution of your application.

Now you might be asking yourself "If I'm already doing IOC, why do I need wire.js?".  The example above is just one form of IOC.  Wire.js provides another important kind of IOC: *Dependency Inversion*.

Dependency Inversion
--------------------

[Dependency Inversion](http://en.wikipedia.org/wiki/Dependency_inversion_principle "Dependency inversion principle - Wikipedia, the free encyclopedia") is an  IOC pattern where concrete components do not directly depend on other concrete components, but rather on abstractions and APIs.  The concrete dependencies are provided, via a mechanism such as Depedency Injection (more info below) by the environment in which the components are used.

So, the "inversion" in this case, refers to how components' dependencies are satisfied.

This is probably a good time to go read [Martin Fowler's well known article on the subject](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for a more extensive explanation and examples.  [Jim Weirich's presentation from OSCON 2005](http://onestepback.org/articles/depinj/index.html "OSCON 2005 - Dependency Injection - Cover") is also an excellent introduction to both Dependency Inversion and Dependency Injection, and well worth reading.

*As a side note*: The term IOC Container is usually a bit of a misnomer.  Most IOC Containers focus primarily on providing Dependency Inversion, and so a better name might be "Dependency Inversion Container".  Fowler mentions this as well.

### Abstractions

Software is built on abstractions, and good abstractions have well-defined APIs.  When concrete implementations depend on abstractions, rather than on other concrete implementations, components can be mixed and matched more easily, and configured to handle a wider variety of situations.

### A Simple Example

Consider [Dojo's dojo/store package](http://dojotoolkit.org/features/1.6/object-store "Dojo Object Stores - The Dojo Toolkit"), which provides several types of data stores:

* JsonRest fetches data from REST endpoints
* Memory uses in-memory POJOs
* Observable decorates a store to provide notifications to listeners
* Cache decorates a store to provide basic caching

All the stores implement the same standard API: get(), put(), add(), and query().

You could easily design a view that displays data from any dojo/store implementation, by designing your view to depend on the dojo/store standard API rather than on any of the particular store implementations.

By applying the Dependency Inversion pattern, via a Dependency Injection for example, a higher level component (or the platform or environment itself in some cases) could provide the actual store implementation for each instance of your view.

Dependency Injection
--------------------

[Dependency Injection](http://en.wikipedia.org/wiki/Dependency_Injection "Dependency injection - Wikipedia, the free encyclopedia") is a mechanism for implementing Dependency Inversion.

*More coming soon*