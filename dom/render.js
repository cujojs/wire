/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom/render plugin
 * wire plugin that provides a factory for dom nodes via a simple html
 * template.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['./../lib/dom/base', './reactive/tokensToString', 'when'], function (base, tokenToString, when) {

	var parentTypes, getFirstTagNameRx, isPlainTagNameRx,
		undef;

	// elements that could be used as root nodes and their natural parent type
	parentTypes = {
		'li': 'ul',
		'td': 'tr',
		'tr': 'tbody',
		'tbody': 'table',
		'thead': 'table',
		'tfoot': 'table',
		'caption': 'table',
		'col': 'table',
		'colgroup': 'table',
		'option': 'select'
	};

	getFirstTagNameRx = /<\s*(\w+)/;
	isPlainTagNameRx = /^[A-Za-z]\w*$/;

	/**
	 * Constructs a DOM node and child nodes from a template string.
	 * Information contained in a hashmap is merged into the template
	 * via tokens (${name}) before rendering into DOM nodes.
	 * Nothing is done with the css parameter at this time.
	 * @param {String} template html template
	 * @param {Object} options
	 * @param {Object} [options.replace] string replacements hash
	 * @param {Object} [options.transform] string replacements transform function
	 * @param {Object} [options.replacer] string replacer function function () {}
	 * @param {HTMLElement} [options.at] node to replace with root node of rendered template
	 * @returns {HTMLElement}
	 */
	function render (template, options) {
		var node, replacer;

		replacer = options.replacer || tokenToString;

		// replace tokens (before attempting to find top tag name)
		template = replacer('' + template, options);

		if (isPlainTagNameRx.test(template)) {
			// just 'div' or 'a' or 'tr', for example
			node = document.createElement(template);
		}
		else {
			// create node from template
			node = createElementFromTemplate(template);
		}

		if (options.at) {
			node = safeReplaceElement(node, options.at);
		}

		return node;
	}

	render.wire$plugin = function (/*ready, destroyed, options*/) {
		return {
			factories: {
				render: domRenderFactory
			},
			proxies: [
				base.proxyNode
			]
		};
	};

	return render;

	/**
	 * Finds the first html element in a string, extracts its tag name,
	 * and looks up the natural parent element tag name for this element.
	 * @private
	 * @param {String} template
	 * @returns {String} the parent tag name, or 'div' if none was found.
	 */
	function getParentTagName (template) {
		var matches;

		// TODO: throw if no element was ever found?
		matches = template.match(getFirstTagNameRx);

		return parentTypes[matches && matches[1]] || 'div';
	}

	/**
	 * Creates an element from a text template.  This function does not
	 * support multiple elements in a template.  Leading and trailing
	 * text and/or comments are also ignored.
	 * @private
	 * @param {String} template
	 * @returns {HTMLElement} the element created from the template
	 */
	function createElementFromTemplate (template) {
		var parentTagName, parent, first, child;

		parentTagName = getParentTagName(template);
		parent = document.createElement(parentTagName);
		parent.innerHTML = template;

		// we just want to return first element (nodelists and fragments
		// are tricky), so we loop through all top-level children to ensure
		// we only have one.

		// try html5-ish API
		first = parent.firstElementChild;
		child = parent.lastElementChild;

		// old dom API
		if (!first) {
			child = parent.firstChild;
			while (child) {
				if (child.nodeType == 1 && !first) {
					first = child;
				}
				child = child.nextSibling;
			}
		}

		if (first != child) {
			throw new Error('render: only one element per template is supported.');
		}

		return first;
	}

	/**
	 * Creates rendered dom trees for the "render" factory.
	 * @param {Object} resolver
	 * @param {Object} componentDef
	 * @param {Function} wire
	 */
	function domRenderFactory (resolver, componentDef, wire) {
		when(wire(componentDef.options), function (options) {
			var template;
			template = options.template;
			if (!template) {
				template = options;
				options = {};
			}
			return render(template, options);
		}).then(resolver.resolve, resolver.reject);
	}

	/**
	 * Replaces a dom node, while preserving important attributes
	 * of the original.
	 * @private
	 * @param {HTMLElement} oldNode
	 * @param {HTMLElement} newNode
	 * @returns {HTMLElement} newNode
	 */
	function safeReplaceElement (newNode, oldNode) {
		var i, attr, parent;

		for (i = 0; i < oldNode.attributes.length; i++) {
			attr = oldNode.attributes[i];
			if ('class' == attr.name) {
				// merge css classes
				// TODO: if we want to be smart about not duplicating classes, implement spliceClassNames from cola/dom/render
				newNode.className = (oldNode.className ? oldNode.className + ' ' : '')
					+ newNode.className;
			}
			// Note: IE6&7 don't support node.hasAttribute() so we're using node.attributes
			else if (!newNode.attributes[attr.name]) {
				newNode.setAttribute(attr.name, oldNode.getAttribute(attr.name));
			}
		}
		parent = oldNode.parentNode;
		if (parent) {
			parent.replaceChild(newNode, oldNode);
		}
		return newNode;
	}

});
