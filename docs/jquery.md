# jQuery integration

Wire.js, like all cujo.js projects, is designed to integrate with other
libraries such as jQuery.

## jQuery $(selector)

Wire.js provides support for DOM querying via several methods, including
jQuery.  For more information about DOM querying, see 
[Working with the DOM](dom.md). 

## jQuery .on()

The full power of jQuery's `.on()` method is implemented via the 
[wire/jquery/on](connections.md#dom-events) plugin.

## jQuery UI widgets

Wire.js has built-in support for jQuery UI widgets via the wire/jquery/ui 
plugin.  Other widget libraries that are built on top of jQuery UI, such 
as wijmo widgets, are likely supported, as well.

To create a jQuery UI widget, use the "widget" factory included in the 
wire/jquery/ui plugin.  The factory requires the widget's constructor ("type")
and a DOM node.  You may specify options for the widget, as well.

Since jQuery UI widgets don't have actual properties or methods, the plugin
treats the plugin's options as properties.  If an property is specified, the
corresponding option is used instead.  If no corresponding option exists, the
plugin assumes the developer wishes to store a property in the widget's data
store, instead.

There are a few widget "properties" that are inherited from jQuery's 
abstraction over the DOM node.  For example, jQuery has built-in methods such
as `.val()`, `.height()`, and `.width()`.  These may also be treated as
properties and the plugin will get or set their DOM-specific values.

jQuery UI widgets enjoy a special feature that allows direct connections
between widgets by linking the widgets via automatically generated getters
and setters.  When the spec refers to a method whose name starts with "set"
or "get", and there is no *actual* method with that name, the plugin assumes
the method is a getter or a setter.

The following code example shows how to create and configure jQuery UI widgets
(wijmo widgets in this case) as well as how to connect them together via
automatically generated getters and setters and a mediator.

```js
define({

	// this is a wijmo wizard widget
	wizard: {
		widget: {
			// type of widget
			type: 'wijwizard',
			// where to create this widget in the dom
			node: { $ref: 'dom!pages' },
			// wizard widget options
			options: {
				navButtons: 'none'
			}
		}
	},

	// this is a wijmo pager widget
	pager: {
		widget: {
			// type of widget
			type: 'wijpager',
			// where to create it in the dom
			node: { $ref: 'dom!pager' },
			// pager widget options
			options: {
				pageCount: 3,
				pageIndex: 1,
				mode: 'numeric'
			}
		},
		on: {
			// when page index changes, tell mediator.
			// this could also be done with the pageIndexchanged option, but is
			// more compact when using the "on" facet.
			wijpagerpageindexchanged: 'mediator.pageChanged'
		}
	},
	
	// a mediator to coordinate changes in widgets. 
	mediator: {
		prototype: {
			// if the page changes, copy it from the pager to the wizard.
			// we are using automatically-generated setters and getters here.
			pageChanged: { compose: 'pager.getPageIndex | wizard.setActiveIndex' }
		},
		// at startup, set the wizard's page
		ready: 'pageChanged'
	},

	plugins: [
		{ module: 'wire/debug' },
		{ module: 'wire/jquery/ui' },
		{ module: 'wire/jquery/on' },
		{ module: 'wire/jquery/dom' }
	]
	
});
```