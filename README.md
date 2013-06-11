# wire.js

Wire is an [Inversion of Control Container](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the
Dependency Injection pattern")
for Javascript apps, and acts as the Application Composition layer for
[cujoJS](http://cujojs.com).

Wire provides architectural plumbing that allows you to create and manage
application components, and to connect those components together in loosely
coupled and non-invasive ways.  Consequently, your components will be more
modular, easier to unit test and refactor, and your application will be
easier to evolve and maintain.

To find out more, read the [full introduction](docs/introduction.md),
more about the [concepts behind wire](docs/concepts.md),
and check out a few [example applications](docs/introduction.md#example-apps).

# Documentation

1. [Getting Started](docs/get.md)
1. [Reference Documentation](docs/README.md)
1. [Example Code and Apps](docs/introduction.md#example-apps)

# What's new

### 0.10.0

* Support for creating and managing [jQuery UI Widgets](docs/jquery.md#jquery-ui-widgets) (much like the existing Dijit widget support).
* More compact syntax for including plugins: just [include the module id](docs/plugins.md#using-plugins) as a string! The [object syntax](docs/plugins.md#plugin-options) is still supported as well.
* New [docs for using and creating](docs/plugins.md) wire plugins.
* Many other [documentation](docs) additions and improvements.
* [New APIs available to plugins](docs/plugins.md#plugin-api) for monitoring the overall state of wiring, inserting components into the current context, and more.
* Many internal improvements:
	* Reduced overall memory usage
	* Improved wiring performance
	* Preparing for a bunch of new awesomeness in upcoming releases
* Compatibility with when.js 1.5.0 - 2.x.
	* **NOTE:** wire 0.10.x is the last set of releases that will be compatible with when < 2.0.

### 0.9.4

* Fix for [render factory](docs/dom.md#rendering-dom-elements) in IE8.

### 0.9.3

* Compatibility with when.js 1.5.0 - 2.0.x.  If you use when >= 2.0.0, you *MUST* update to wire 0.9.3.  There are no other changes in 0.9.3.

### 0.9.2

* IE-specific fix for `wire/debug`'s `trace` option.  See [#78](https://github.com/cujojs/wire/issues/78)

### 0.9.1

* Fix for compose factory. See [#69](https://github.com/cujojs/wire/issues/69)

### 0.9.0

* [Get it!](docs/get.md)
* [All new documentation](docs/README.md)
* [Even more DOM support](docs/dom.md), including DOM event connections via wire/on and cloning DOM elements.
* [Functions are first-class citizens](docs/functions.md) that can be used in very powerful ways.
* [Transform connections](docs/connections.md#transform-connections) use functions to transform data as it flows through connections (including DOM event connections).
* Built on latest [cujo.js](http://cujojs.com) platform:
	* [curl](https://github.com/cujojs/curl) >= 0.7.1, or 0.6.8
	* [when](https://github.com/cujojs/when) >= 1.5.0
	* [meld](https://github.com/cujojs/meld) >= 1.0.0
	* [poly](https://github.com/cujojs/poly) >= 0.5.0

[Full Changelog](CHANGES.md)

# License

wire.js is licensed under [The MIT License](http://www.opensource.org/licenses/mit-license.php).
