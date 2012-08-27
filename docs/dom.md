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