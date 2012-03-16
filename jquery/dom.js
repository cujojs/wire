/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/jquery/dom plugin
 * jQuery-based dom! resolver
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['../plugin-base/dom', 'jquery'], function(createDomPlugin, jquery) {

	return createDomPlugin({
		query: jquery,
		first: function (selector, root) {
			return jquery(selector, root).first();
		},
		addClass: function(node, cls) {
			jquery(node).addClass(cls);
		},
		removeClass: function(node, cls) {
			jquery(node).removeClass(cls);
		},
		placeAt: function (node, refNode, location) {
			var $node = jquery(node);
			// `if else` is more compressible than switch
			if (!isNaN(location)) {
				var $children;
				$children = $node.siblings();
				if (location <= 0) {
					$node.prependTo(refNode);
				}
				else if (location >= children.length) {
					$node.appendTo(refNode);
				}
				else {
					$children.eq(location).before(node);
				}
			}
			else if(location == 'at') {
				jquery(refNode).empty().append(node);
			}
			else if(location == 'last') {
				$node.appendTo(refNode);
			}
			else if(location == 'first') {
				$node.prependTo(refNode);
			}
			else if(location == 'before') {
				$node.insertBefore(refNode);
			}
			else if(location == 'after') {
				$node.insertAfter(refNode);
			}
			else {
				throw new Error('Unknown dom insertion command: ' + location);
			}
			return node;
		}
	});

});
