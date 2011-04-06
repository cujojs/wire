/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: dom.js
	wire plugin that provides a resource resolver for dom nodes, by id, in the
	current page.  This allows easy wiring of page-specific dom references into
	generic components that may be page-independent, i.e. makes it easier to write
	components that can be used on multiple pages, but still require a reference
	to one or more nodes on the page.
*/
define({
	/*
		Function: dom
		Resolves a reference to a dom node on the page by its id
		
		Parameters:
			factory - wiring factory
			name - id of dom node
			refObj - complete JSON ref
			promise - factory-provided <Promise> that will be resolved with the
				dom node.
	*/
	wire$plugin: function domPlugin(ready, options) {
		return {
			resolvers: {
				dom: function(id, refObj, wire, promise) {
					wire.domReady(function() {
						var node = document.getElementById(id);
						if(node) promise.resolve(node);
						else promise.reject();				
					});
				}
			}
		}
	}
});