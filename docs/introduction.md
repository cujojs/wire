# Introduction

Wire.js is an [Inversion of Control Container](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for Javascript apps.

As [cujo.js](http://cujojs.com)’s application composition layer, it provides a well-defined place for creating, configuring, and *non-invasively* connecting together the components of an application, or a chunk of an application.

With wire.js, you focus on coding the application logic of components and let wire.js handle the bootstrapping and the glue that connects them together.  You write some simple, declarative JSON (or Javascript) that describes how components should be composed together, and wire will load, configure, and connect those components to create an application, and will clean them up later.

## Features

* Simple, declarative dependency injection
* A flexible, non-invasive connection infrastructure
* Powerful core tools and plugin architecture for integrating popular frameworks and existing code.
* Support for both browser and server environments
