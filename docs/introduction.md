# Introduction

Wire.js is an [Inversion of Control Container](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for Javascript apps.

As [cujoJS](http://cujojs.com)’s application composition layer, it provides a well-defined place for creating, configuring, and *non-invasively* connecting together the components of an application, or sections of an application.

With wire.js, you focus on coding the application logic of components and let wire.js handle the bootstrapping and the glue that connects them together.  You write simple, declarative JSON (or Javascript) that describes how components should be composed together, and wire will load, configure, and connect those components to create an application, and will clean them up later.

## Features

Wire.js provides:

* Simple, declarative dependency injection
* A flexible, non-invasive connection infrastructure
* Application lifecycle management
* Powerful core tools and plugin architecture for integrating popular frameworks and existing code.
* Support for both browser and server environments

Apps constructed with wire.js:

* Have a high degree of modularity
* Can be unit tested easily, because they inherently separate application logic from application composition
* Allow application structure to be refactored independently from application logic
* Have no explicit dependencies on DOM Ready, DOM query engines, or DOM event libraries

## Learn more

* [Documentation](README.md). Wire.js has ample docs. The best place to start is [Understanding the concepts](concepts.md).
* [Sample apps](http://know.cujojs.com/samples). Once you've got a feel for what you can accomplish with wire.js, install, run, and tweak these.
* [Tutorials](http://know.cujojs.com/). New tutorials are posted every week.
