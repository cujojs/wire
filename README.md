# wire.js

Wire is an [Inversion of Control Container](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for Javascript apps, and acts as the Application Composition layer for [cujo.js](http://cujojs.com).

Wire provides architectural plumbing that allows you to create and manage application components, and to connect those components together in loosely coupled and non-invasive ways.  Consequently, your components will be more modular, easier to unit test and refactor, and your application will be easier to evolve and maintain.

To find out more, read the [full introduction](wire/blob/master/docs/introduction.md), more about the [concepts behind wire](wire/blob/master/docs/concepts.md), and check out a few [example applications](wire/blob/master/docs/introduction.md#example-apps).

# Documentation

1. [Getting Started](wire/blob/master/docs/get.md)
1. [Reference Documentation](wire/blob/master/docs/TOC.md)
1. [Example Code Applications](wire/blob/master/docs/introduction.md#example-apps)

# What's new

### 0.9.0

* [Get it!](wire/blob/master/docs/get.md)
* [All new documentation](wire/blob/master/docs/TOC.md)
* [Even more DOM support](wire/blob/master/docs/dom.md), including DOM event connections via wire/on and cloning DOM elements.
* [Functions are first-class citizens](wire/blob/master/docs/functions.md) that can be used in very powerful ways.
* [Transform connections](#transform-connections) use functions to transform data as it flows through connections (including DOM event connections).
* Built on latest [cujo.js](http://cujojs.com) platform:
	* [curl](https://github.com/cujojs/curl) >= 0.7.1, or 0.6.8
	* [when](https://github.com/cujojs/when) >= 1.5.0
	* [meld](https://github.com/cujojs/meld) >= 1.0.0
	* [poly](https://github.com/cujojs/poly) >= 0.5.0

[Full Changelog](https://github.com/cujojs/wire/wiki/Changelog)

# License

wire.js is licensed under [The MIT License](http://www.opensource.org/licenses/mit-license.php).
