# wire.js

Wire.js is an [Inversion of Control Container](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for Javascript apps.

With wire.js, you can focus on coding the business logic of your components and let wire.js handle the bootstrapping and the glue that connects them together.  You write a simple wiring spec in JSON (or Javascript) that describes how your components should be wired together, and wire will load, configure, and connect those components to create your application, and will clean them up later.

### Specifically, wire.js provides:

* Component lifecycle management
* Dependency Inversion via constructor and setter Dependency Injection
* Automatic dependency ordering
* Connectors
* Service locator pattern and reference resolution

### Plugins

Wire.js also has a plugin architecture that allows plugins to provide new capabilities to wire.js *and syntax* to wiring specs.  Here are some of the capabilities provided by the bundled plugins:

* Dependency Injection for DOM nodes.  For example, you can reference DOM nodes by id *or dom query*, and inject them into your views.
* Event and PubSub connectors. Write your components without any glue code, and connect them together in the wiring spec using events or pubsub.  The event connector works for DOM nodes, too!
* Aspect Oriented Programming (AOP).  Wire.js comes with an AOP plugin that allows you to declaratively apply decorators, before/after/around advice, and to introduce mixins on the fly.

Plugins also allow you to use capabilities of your existing modules/libraries/frameworks.  For example, wire.js has a set of plugins for Dojo that allow it to integrate with Dijit's widget system, to use dojo.connect as the event connector, and dojo.publish/subscribe as the pubsub connector.  If you are already using those aspects of Dojo, you can use the wire.js's Dojo plugins to integrate easily with all your existing components.

# Ok, What Now?

1. Read on for a simple Hello World example.
1. Check out the [wire.js presentation from JSConf 2011](http://bit.ly/mkWy1L "wire.js - Javascript IOC Container w/Dependency Injection").
1. Get the code for the [Piratescript or N00bscript](https://github.com/briancavalier/piratescript) game from the presentation.
1. See the [wiki for more documentation](https://github.com/briancavalier/wire/wiki)
1. Download and try it out!
1. More coming soon...

# License

wire.js is licensed under [The MIT License](http://www.opensource.org/licenses/mit-license.php).

## wire <3 AMD

While wire is not a Javascript AMD loader, like [curl](https://github.com/unscriptable/curl), [RequireJS](http://requirejs.org/ "RequireJS"), or [backdraft's bdload](http://bdframework.org/bdLoad/index.html "bdLoad - the backdraft AMD loader - home"), it does use an AMD-compliant loader to do its job of assembling modules and objects into a running application.

wire is intended to play well with any AMD loader that you might already be using.  It can work with modules that have been fully built and optimized into a single file, into multiple layers (a la the RequireJS build tool), or totally unoptimized modules (e.g. during development).

In fact, wire plugins are themselves AMD modules, and can be loaded dynamically during development or included in your optimized build for deployment.