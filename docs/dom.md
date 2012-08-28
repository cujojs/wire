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

# Querying the DOM

# Cloning DOM nodes

# Inserting DOM nodes

# Modifying CSS classes

# Listening for events

See [[wire/on]] for information about adding event listeners to DOM nodes.
