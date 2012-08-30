# Working with DOM Nodes

When using wire.js in a browser, you're likely going to need to work with DOM nodes.  No problem.  You can query, move, create, and manipulate DOM nodes directly in wire specs!  Use the built-in wire/jquery/dom or wire/dom/dojo plugins to leverage the DOM manipulation features of those libraries, or use wire's lightweight wire/sizzle plugin, or -- if you're targeting modern browsers only -- use the tiny wire/dom plugin.

All of these DOM plugins have the exact same set of features and identical syntax so they're interchangeable.  Start out with wire/dom during early development and move over to wire/sizzle to target a wider range of browsers later if necessary.

For simplicity, we will refer to the entire set of these plugins as wire/*/dom, rather than write the entire set every time.

### Browser support

The wire/jquery/dom and wire/dojo/dom plugins support the same browsers as their underlying library.  So, for instance, if you are using jQuery 1.8.0, you can expect wire/jquery/dom to work with IE6+ and the current version of all other major browsers.

The wire/sizzle plugin similarly supports the same browsers as Sizzle.  (Sizzle is the query engine used by jQuery.)

wire/dom relies on `querySelectorAll` for some features.  Therefore, some features don't work in IE6-7.  In addition, IE8 doesn't support many CSS3 selectors.  You should probably only use wire.dom in production if you only need to support fairly recent versions of the major browsers.  Use wire/sizzle instead.

## Querying the DOM

The wire/*/dom plugins expose a couple of [reference resolvers](needs reference!) for obtaining elements in the document.  

## Cloning DOM nodes

## Inserting DOM nodes

## Modifying CSS classes

# Working with DOM events

See [[wire/on]] for information about adding event listeners to DOM nodes.

# Rendering the DOM

Wire includes a DOM rendering plugin, wire/dom/render that exposes a wire factory.  The `render` factory creates a DOM fragment from a logic-less HTML template.  You may specify an accompanying CSS file, an i18n string bundle, and a DOM element onto which to merge the rendered DOM fragment.  For better placement control, you can also use the [wire/dom](#inserting-dom-nodes) plugin's `insert` facet to place the DOM fragment in or around any other DOM node.

### Why logic-less?

We include a logic-less template engine mainly for better separation of concerns, but also for better [encapsulation, reuse, and maintainability](http://www.cs.usfca.edu/~parrt/papers/mvc.templates.pdf Enforcing Strict Model-View Separation in Template Engines). Most of the use cases for using logic in templates fall into the following categories:

* conditional visibility of sub-views
* creation of a collection of sub-views in a loop
* transformation or formatting of data

Conditional visibility can often be better solved by toggling CSS state classes at the top element of a view.  [wire/dom/transform](#modifying-css-classes) has several helper functions that can be easily composed into your wire specs.

Creating several sub-views in a loop is a sure sign that your view is data-driven.  Consider using a data-binding library, such as [cola.js](https://github.com/cujojs/cola).  Similarly, data formatting can typically be more elegantly handled in a wire spec than in a template language.  [wire/aop](./aop.md)

If you have existing templates that use other template engines, such as [mustache](http://mustache.github.com/) or [handlebars](http://handlebarsjs.com//), you can still use them.

# DOMReady

When you use wire to reference DOM Nodes via any of the DOM-related plugins (e.g. [[wire/dom]], [[wire/sizzle]], etc.), wire will only resolve the DOM Node reference after the DOM is ready.  You don't need to worry about DOM Ready--simply reference DOM Nodes or do DOM queries (e.g. via [[wire/sizzle]], [[wire/dojo/dom]], [[wire/jquery/dom]]), and wire will do the right thing.

To do this, wire relies on its environment providing a `domReady!` AMD plugin.  Alternatively, wire will detect a global `require.ready` function for backward compatibility with some loaders (e.g. older versions of RequireJS).

This works just fine in AMD loaders that don't use a "last ditch" timeout, such as [curl.js](https://github.com/cujojs/curl), to try to detect module loading failures.  However, if you're using a loader that does use a last ditch timeout, module loading will halt with an error if the timeout expires before all modules have loaded.  RequireJS, for example, uses such a timeout--[and allows it to be configured](http://requirejs.org/docs/api.html#config).  If your page's DOMReady takes longer than the timeout, module loading will fail, causing wire to fail.

There are a couple of workarounds:

1. Increase the loader's timeout, if possible.
1. Tell wire to use a `domReady` *module* instead of the `domReady!` plugin.  You can do this by configuring your loader's paths or aliases to map `wire/domReady` to your domReady module, which must return a function that accepts a callback to call when the DOM is ready.

Here is an example path config for RequireJS that aliases `wire/domReady` to RequireJS's `domReady` module:

```javascript
require = {
	// ... baseUrl, etc.
	paths: {
		// alias wire/domReady to RequireJS's domReady
		// Right-hand-side must be relative to baseUrl, as usual
		'wire/domReady': 'path/to/requirejs/domReady',

		// ... other paths ...
	}
};
```
