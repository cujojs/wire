# Working with the DOM

1. [Querying the DOM](#querying-the-dom)
1. [Cloning DOM nodes](#cloning-dom-nodes)
1. [Inserting DOM nodes](#inserting-dom-nodes)
1. [Connecting DOM events](#connecting-dom-events)
1. [Rendering DOM elements](#rendering-dom-elements)
	1. [Creating DOM components](#creating-dom-components)
1. [Notes on DOMReady](#notes-on-domready)

When using wire.js in a browser, you're likely going to need to work with DOM nodes.  No problem.  You can query, move, create, and manipulate DOM nodes directly in wire specs!  Use the built-in wire/jquery/dom or wire/dom/dojo plugins to leverage the DOM manipulation features of those libraries, or use wire's lightweight wire/sizzle plugin, or -- if you're targeting modern browsers only -- use the tiny wire/dom plugin.

All of these DOM plugins have the exact same set of features and identical syntax so they're interchangeable.  Start out with wire/dom during early development and move over to wire/sizzle to target a wider range of browsers later if necessary.

For simplicity, we will refer to the entire set of these plugins as wire/*/dom, rather than write the entire set every time.

## Browser support

The wire/jquery/dom and wire/dojo/dom plugins support the same browsers as their underlying library.  So, for instance, if you are using jQuery 1.8.0, you can expect wire/jquery/dom to work with IE6+ and the current version of all other major browsers.

The wire/sizzle plugin similarly supports the same browsers as Sizzle.  (Sizzle is the query engine used by jQuery.)

wire/dom relies on `querySelectorAll` for some features.  Therefore, some features don't work in IE6-7.  In addition, IE8 doesn't support many CSS3 selectors.  You should probably only use wire.dom in production if you only need to support fairly recent versions of the major browsers.  Use wire/sizzle instead.

# Querying the DOM

The wire/*/dom plugins expose a couple of [reference resolvers](concepts.md#references) for obtaining elements in the document.

### `dom!`

The `dom!` resolver is wire's equivalent to `document.getElementById()`.  Use it to grab a reference to an element by its id attribute.  For instance, if your applications main container element has an id of "main", you would access it like this:

```js
mainContainer: { $ref: 'dom!main' }
```

### `dom.all!` (`dom.query!`)

The `dom.all!` resolver is wire's way to find node by CSS selector.  It's just like `document.querySelectorAll()` -- or `$()` if you're familiar with jQuery.

If you'd like to gather a list of all buttons with a CSS class of "clickme" in combination with all checkboxes, you could do it like this:

```js
myClickables: { $ref: 'dom.all!button.clickme, input[type=checkbox]' }
```

`dom.query!` is an alias for `dom.all!`.

> Note: There's no guarantee that the list of elements returned from `dom.all!` will be a NodeList or an array.  It could be either, depending on the wire/*/dom plugin used or the browser.  You should probably assume that the list returned is array-like and convert it to an array like this:

```js
var nodeArray = Array.prototype.slice.call(nodeList);
```

### `dom.first!`

Just as `dom.all!` is wire's `document.querySelectorAll()`, `dom.first!` is wire's `document.querySelector()`.  `dom.first!` gets the *first* element that satisfies the CSS query.  Use it like this:

```js
deepNodeInMyView: { $ref: 'dom.first!.my-view form.ship-to label.first-name' }
```

### `element` factory

The `dom!` reference resolver is the preferred way to grab a reference to a single DOM node.  However, if you plan to use [wire facets](concepts.md#references) on the DOM node, a reference resolver won't work.  Facets only run on components that are created using a [factory](concepts.md#references).  There's probably only one common use case that requires using a facet on a DOM node that's *already in the document*: moving the node.  For this reason, there's the `element` wire factory.  Here's it is in action:

```js
{
	moveableList: {
		element: { $ref: 'dom.first!.move-me' },
		insert: { last: 'newParent' },
	},
	newParent: { $ref: 'dom.first!.new-parent' }
}
```

# Cloning DOM nodes

The clone [factory](concepts.md#factories) also works with single DOM nodes. It's as simple as this:

```js
clonedButton: { clone: { $ref: 'dom!orig-button' } }
```

# Inserting DOM nodes

Once you have a reference to a node using either the [`element` factory](#element-factory), [`clone` factory](#Cloning-DOM-nodes), or [`render` factory](#Rendering-DOM-nodes), you can use the `insert` facet.

The `insert` facet executes during the [initialize phase](concepts.md#component-lifecycle) and takes a single option, which can be any of the following:

* `last` -- DOM node is inserted as the last child of a reference node
* `first` -- DOM node is inserted as the first child of a reference node
* `after` -- DOM node is inserted after a reference node
* `before` -- DOM node is inserted before a reference node
* `at` -- the DOM node replaces the entire set of child nodes of a reference element

The reference node can be provided as the name of a component or as a reference using one of wire/*/dom reference resolvers.

A common use case for `insert` is moving a node:

```js
{
	movedElement: {
		element: { $ref: 'dom.first!.my-node' },
		// this is just shortcut notation. see the next example
		insert: { after: 'specialPlace' }
	},
	specialPlace: { $ref: 'dom.first!.my-special-place' }
}
```

Here's the same example using an reference resolver:

```js
{
	movedElement: {
		element: { $ref: 'dom.first!.my-node' },
		// this is just shortcut notation. see the next example
		insert: { after: { $ref: 'specialPlace' } }
	},
	specialPlace: { $ref: 'dom.first!.my-special-place' }
}
```

Again, using an inline `dom.first!` reference resolver:

```js
{
	movedElement: {
		element: { $ref: 'dom.first!.my-node' },
		insert: { after: { $ref: 'dom.first!.my-special-place' } }
	}
}
```

The `insert` facet can also be used to insert a DOM node into multiple places at once.  If you're familiar with jQuery's `.appendTo()` function, this should feel familiar:

```js
{
	clonedElement: {
		element: { $ref: 'dom.first!.adoptee' },
		insert: { first: { $ref: 'dom.all!.adopter' } }
	}
}
```

As the example suggests, the element is cloned as many times as needed to be inserted into each of the reference elements.  Each element with the class name "adopter" will have an element with the class name "adoptee" as its first child.  After cloning and inserting, the wire component refers to the original "adoptee" element.  This element will have been inserted in the first "adopter" element found in the document.  All other "adopter" elements will have a clone of the original as their first child.

## Modifying CSS classes

TODO

# Connecting DOM events

See the [DOM events](./connections.md#dom-events) section of [Connections](./connections.md) for information about adding event listeners to DOM nodes.

# Rendering DOM nodes

## `render` factory

Wire includes a DOM rendering plugin, wire/dom/render that exposes a wire factory.  The `render` factory creates a DOM fragment from a logic-less HTML template.  You may specify an accompanying CSS file, an i18n string bundle, and a DOM element onto which to merge the rendered DOM fragment.  See the [Creating DOM components](#Creating-DOM-components) section for more information about these advanced options.  To place the rendered DOM fragment into the document, you can also use the [`insert` facet](#inserting-dom-nodes).

The `render` factory can render a DOM fragment from a template defined by a string or an AMD text module.  DOM fragments must be rooted at a single node.  In other words, there can only be one element at the top level of the HTML.  This is valid:

```html
<div class="root">
	<p>My list:</p>
	<ul>
		<li>one</li>
		<li>two</li>
	</ul>
</div>
```

This won't work:

```html
<!-- uh-uh. multiple root nodes: -->
<p>My list:</p>
<ul>
	<li>one</li>
	<li>two</li>
</ul>
```

You may also render a single node by specifying the element name.  Here are some examples:

```js
{
	// render some nodes from a string
	teenyView: {
		render: {
			template: '<div class="root"><p>My list:</p><ul><li>one</li><li>two</li></ul></div>'
		}
	},

	// render some nodes from an AMD module
	hugeView: {
		render: {
			template: { module: 'text!my-view/template.html' }
		}
	},

	// render a single node using shortcut notation
	paragraph: { render: 'p' },

	// this also works (not quite as short)
	p2: { render: { template: 'p' } }
}
```

## Creating DOM components

The `render` factory includes other options that make it easy to create self-contained components, such as views and widgets.  If your component defines its own CSS, you may include it, too:

```js
myView: {
	render: {
		template: { module: 'text!my-view/template.html' },
		css: { module: 'css!my-view/structure.css' }
	}
}
```

You can also merge in a set of strings -- for instance an i18n bundle -- by using the `replace` option:

```js
myView: {
	render: {
		template: { module: 'text!my-view/template.html' },
		// get a localized string bundle. this could also be a $ref to component
		replace: { module: 'i18n!my-view/strings.js' },
		css: { module: 'css!my-view/structure.css' }
	}
}
```

The `render` plugin also has a special feature for merging the rendered DOM fragment into an existing element in the document.  Let's say you have a placeholder element in the document and you want to replace it with your template.  If the `render` plugin simply clobbered the placeholder element with the rendered DOM fragment, any attributes of the placeholder would be lost.  For instance, it's probably important to preserve the `id` and `className` attributes of the placeholder.  The `render` plugin will merge the attributes of the placeholder with the root element of the DOM fragment to be inserted. (Dojo developers will recognize that dijits do this, too.)  Note: no child elements are preserved, just attributes.

Here's how you specify a placeholder to be replaced:

```js
myView: {
	render: {
		template: { module: 'text!my-view/template.html' },
		replace: { module: 'i18n!my-view/strings.js' },
		css: { module: 'css!my-view/structure.css' },
		// here's the interesting bit
		at: { $ref: 'dom!my-placeholder' }
	}
}
```

### Why logic-less templates?

We include a logic-less template engine mainly for better separation of concerns, but also for better [encapsulation, reuse, and maintainability](http://www.cs.usfca.edu/~parrt/papers/mvc.templates.pdf Enforcing Strict Model-View Separation in Template Engines). Most of the use cases for using logic in templates fall into the following categories:

* conditional visibility of sub-views
* creation of a collection of sub-views in a loop
* transformation or formatting of data

Conditional visibility can often be better solved by toggling CSS state classes at the top element of a view.  [wire/dom/transform](#modifying-css-classes) has several helper functions that can be easily composed into your wire specs.

Creating several sub-views in a loop is a sure sign that your view is data-driven.  Consider using a data-binding library, such as [cola.js](https://github.com/cujojs/cola).  Similarly, data formatting can typically be handled more elegantly in a wire spec than in a template language.  [wire/aop](./aop.md)

If you have existing templates that use other template engines, such as [mustache](http://mustache.github.com/) or [handlebars](http://handlebarsjs.com/), you can still use them.

# Notes on DOMReady

When you use wire to reference DOM Nodes via any of the DOM-related plugins (e.g. wire/dom, wire/dom, wire/sizzle, etc.), wire will only resolve the DOM Node reference after the DOM is ready.  You don't need to worry about DOM Ready--simply reference DOM Nodes or do DOM queries (e.g. via `dom!`, `dom.first!`, etc.), and wire will do the right thing.

To do this, wire relies on its environment providing a `domReady!` AMD plugin.  Alternatively, wire will detect a global `require.ready` function for backward compatibility with some loaders (e.g. older versions of RequireJS).

This works just fine in AMD loaders that don't use a "last ditch" timeout, such as [curl.js](https://github.com/cujojs/curl), to try to detect module loading failures.  However, if you're using a loader that does use a last ditch timeout, module loading will halt with an error if the timeout expires before all modules have loaded.  RequireJS, for example, uses such a timeout--[and allows it to be configured](http://requirejs.org/docs/api.html#config).  If your page's DOMReady takes longer than RequireJS's timeout, module loading will fail, causing wire to fail.

There are a couple of workarounds:

1. Increase the loader's timeout, if possible.
1. Tell wire to use a `domReady` *module* instead of the `domReady!` *plugin*.  You can do this by configuring your loader's paths or aliases to map `wire/domReady` to your domReady module, which must return a function that accepts a callback to call when the DOM is ready.

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

(Just to be clear, curl.js doesn't use a timeout and so doesn't require these work-arounds.  Why are you still using RequireJS? :) )
