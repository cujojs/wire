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
		
		Parameters:
			factory - wiring factory
			name - id of dom node
			refObj - complete JSON ref
			promise - factory-provided <Promise> that will be resolved with the
				dom node.
	*/
	function byId(promise, name, refObj, wire) {
		domReady(function resolveDomId() {
			var node = document.getElementById(name);
			if(node) promise.resolve(node);
			// Best to throw here since this may be happening async)
			else throw new Error("No DOM node with id: " + name);
		});
	}

	// Wire plugin.
	// Since this plugin has no context-specific needs or functionality, can
	// always return the same object.
	var wirePlugin = {
		resolvers: {
			dom: byId
		}		
	};

	// return function wire$plugin(ready, options) {
	return {
		wire$plugin: function domPlugin(ready, destroyed, options) {
			return wirePlugin;
		}
	};

});