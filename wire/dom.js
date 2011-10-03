/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	Package: dom.js
	wire plugin that provides a resource resolver for dom nodes, by id, in the
	current page.  This allows easy wiring of page-specific dom references into
	generic components that may be page-independent, i.e. makes it easier to write
	components that can be used on multiple pages, but still require a reference
	to one or more nodes on the page.
*/
define(['wire/domReady'], function(domReady) {
	/*
		Function: byId
		Resolves a reference to a dom node on the page by its id
	*/
	function byId(promise, name /*, refObj, wire*/) {
		domReady(function() {
			var node = document.getElementById(name);
			if(node) promise.resolve(node);
			// Best to throw here since this may be happening async)
			else throw new Error("No DOM node with id: " + name);
		});
	}

	function addClass(node, cls) {
		var className = node.className ? ' ' + node.className + ' ' : '';
		
		cls = cls.split(/\s+/);
		
		for (var i = 0, len = cls.length; i < len; i++) {
			var c = ' ' + cls[i];
			if(className.indexOf(c + ' ') < 0) {
				className += c;
			}
		}

		node.className = className.slice(1, className.length);
	}

	function removeClass(node, cls) {
		var className = ' ' + node.className + ' ';

		cls = cls.split(/\s+/);

		for (var i = 0, len = cls.length; i < len; i++) {
			var c = ' ' + cls[i] + ' ';
			className = className.replace(c, ' ');
		}

		node.className = className.replace(/(^\s+|\s+$)/g, '');
	}

	function handleClasses(node, add, remove) {
		if(add) addClass(node, add);
		if(remove) removeClass(node, remove);
	}

	// Wire plugin.
	// Since this plugin has no context-specific needs or functionality, can
	// always return the same object.
	var wirePlugin = {
		resolvers: {
			dom: byId
		}		
	};

	return {
		wire$plugin: function domPlugin(ready, destroyed, options) {

			var node, classes;

			classes = options.classes;

			// Add/remove lifecycle classes if specified
			if(classes) {

				node = document.getElementsByTagName('html')[0];
				
				// Add classes for wiring start
				handleClasses(node, classes.init);

				// Add/remove classes for context ready
				ready.then(function() { handleClasses(node, classes.ready, classes.init); });

				if(classes.ready) {
					// Remove classes for context destroyed
					destroyed.then(function() { handleClasses(node, null, classes.ready); });
				}
			}

			// return the same instance every time, see above.
			return wirePlugin;
		}
	};

});