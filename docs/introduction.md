# Introduction

Wire.js is an [Inversion of Control Container](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for Javascript apps.

With wire.js, you can focus on coding the application logic of components and let wire.js handle the bootstrapping and the glue that connects them together.  You write some simple, declarative JSON (or Javascript) that describes how components should be composed together, and wire will load, configure, and connect those components to create an application, and will clean them up later.

- Merge with paragraph above?

wire.js is cujo.js’s application composition layer.  It provides a well-defined place for creating, configuring, and connecting together the components of an application, or a chunk of an application. It provides infrastructure for connecting components together non-invasively.

## Application Composition

Implementing application logic inside components, and assembling those components together into a running application are very different activities, but many times are done at the same time, in the same code.  That leads to tightly coupled components that can be more difficult to unit test and refactor.

Separating the process of implementing component logic from application composition has some significant benefits:

* It decouples components from each other, making them easier to test and refactor.
* It decouples components from the connection mechanisms, making it easier to change the type of connection (method call, pubsub, advice-based, sync vs. async, etc.) between them. It also means that the connection mechanism need not be involved in unit testing the component’s logic.
* Having a designated spot for composition gives developers a place to look to understand the overall structure of an application
* It also provides the opportunity for tools to generate visual representations of the architecture, as well as opportunities for architectural refactoring tools.

Components can be implemented and tested without embedding connection logic and infrastructure.  The composition and application logic can be refactored independently, many times without affecting each other at all.

## Dependency Inversion

Dependency Inversion is a design pattern whereby components depend on interfaces rather than concrete implementations, and expect to be provided with concrete dependency implementations.  This makes it easier to mix and match component implementations, and helps to make composition and unit testing easier.

Components whose dependencies are configurable are usable in a wider variety of situations, and easier to unit test since their dependencies can be mocked/faked more easily. This further strengthens the benefits of a designated composition layer by centralizing component configuration.  Everyone knows where to look because configuration isn’t scattered all over the code.

wire.js can be used to configure component dependencies in various ways, including constructor and function args, setting properties (on plain JS objects, as well as other “complex” objects, like Dijit widgets), invoking custom “startup” methods, etc.  It works out of the box with components that have been designed in a dependency inversion style, but can also work with nearly any kind of components via its plugin architecture.

## Lifecycle Management

In large systems with many components and connections, manually creating and destroying components can be error prone.  Not destroying components leads to resource leaks.

In a browser environment, it’s infeasible to load all the code (JS, HTML, CSS, images, etc.) that the application will ever need.  Breaking the application into logical chunks that can be pre-fetched in the background at runtime, or delivered on-demand to the browser helps reduce load times and improve user experience.  It also adds complexity around creating and destroying the components in those logical chunks.

Using an application composition layer like wire.js to create, configure and connect the components in each chunk means that it can manage the destruction and cleanup when the chunk is no longer needed.
