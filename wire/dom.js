/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
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
	wire$resolvers: {
		/*
			Function: dom
			Resolves a reference to a dom node on the page by its id

			Reference format:
			dom!node-id
			
			Parameters:
				factory - wiring factory
				name - id of dom node
				refObj - complete JSON ref
				promise - factory-provided <Promise> that will be resolved with the
					dom node.
		*/
		'dom': function(factory, name, refObj, promise) {
			factory.domReady.then(function() {
				var result = document.getElementById(name[0] === '#' ? name.slice(1) : name);
				if(result) {
					promise.resolve(result);
				} else {
					promise.unresolved();
				}
			});
		}
	}
});