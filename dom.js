/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom plugin
 * wire plugin that provides a resource resolver for dom nodes, by id, in the
 * current page.  This allows easy wiring of page-specific dom references into
 * generic components that may be page-independent, i.e. makes it easier to write
 * components that can be used on multiple pages, but still require a reference
 * to one or more nodes on the page.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['./plugin-base/dom', './domReady'], function(createDomPlugin, domReady) {

    /**
     * The usual addClass function
     * 
     * @param node
     * @param cls {String} space separated list of classes
     */
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

    /**
     * The usual removeClass function
     *
     * @param node
     * @param cls {String} space separated list of classes
     */
	function removeClass(node, cls) {
		var className = ' ' + node.className + ' ';

		cls = cls.split(/\s+/);

		for (var i = 0, len = cls.length; i < len; i++) {
			var c = ' ' + cls[i] + ' ';
			className = className.replace(c, ' ');
		}

		node.className = className.replace(/(^\s+|\s+$)/g, '');
	}

	return createDomPlugin({
		addClass: addClass,
		removeClass: removeClass
	});

});