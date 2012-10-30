# Introduction

Wire.js is an [Inversion of Control Container](http://martinfowler.com/articles/injection.html "Inversion of Control Containers and the Dependency Injection pattern") for Javascript apps.

As [cujo.js](http://cujojs.com)’s application composition layer, it provides a well-defined place for creating, configuring, and *non-invasively* connecting together the components of an application, or sections of an application.

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

## Example Apps

### TodoMVC with cujo.js

TodoMVC, the web's new "hello world", implemented using cujo.js shows how wire.js is used to create application components and compose them together.

* [Try the cujo.js TodoMVC app](http://todomvc.com/labs/architecture-examples/cujo/index.html), or
* [Look at the code](https://github.com/cujojs/todomvc/tree/master/labs/architecture-examples/cujo)

### Hello Wire

Hello Wire is a very simple introduction to wire.js.  You can fork and run the application, look at the code, and read the walkthrough.

* [Hello Wire on github](https://github.com/briancavalier/hello-wire.js)
* [Walkthrough in the README](https://github.com/briancavalier/hello-wire.js#hello-wirejs)

### Notes demo

This is a simple notes app built as a demo for Dojoconf 2011 using cujo.js.  It shows several more advanced aspects of wire.js, such as dividing an application into sections that can be wired on-demand, Aspect Oriented Programming (AOP), and Dojo integration via wire.js plugins.

* [Notes demo on github](https://github.com/briancavalier/notes-demo-dojoconf-2011)