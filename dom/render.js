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

define(['./base', 'when'], function (base, when) {

	var parentTypes, parseTemplateRx, getFirstTagNameRx, undef;

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
		'colgroup': 'table'
	};

	parseTemplateRx = /\$\{([^}]*)\}/g;
	getFirstTagNameRx = /<\s*(\w+)/;

	/**
	 * Constructs a DOM node and child nodes from a template string.
	 * Information contained in a hashmap is merged into the template
	 * via tokens (${name}) before rendering into DOM nodes.
	 * Nothing is done with the css parameter at this time.
	 * @param template {String}
	 * @param hashmap {Object}
	 * @param optRefNode {DOMNode}
	 * @param optCss {Object}
	 * @returns {DOMNode}
	 */
	function render (template, hashmap, optRefNode, optCss) {
		var node;

		// replace tokens (before attempting to find top tag name)
		template = replaceTokens(template, hashmap);

		// create node from template
		node = base.elementFromTemplate(template);

		if (optRefNode) {
			node = safeReplaceElement(node, optRefNode);
		}

		return node;
	}

	render.wire$plugin = function (ready, destroyed, options) {
		return {
			factories: {
				render: domRenderFactory
			},
			proxies: [
				nodeProxy
			]
		};
	};

	/**
	 * Creates rendered dom trees for the "render" factory.
	 * @param resolver
	 * @param spec
	 * @param wire
	 */
	function domRenderFactory (resolver, spec, wire) {
		when(wire(spec.render), function (options) {
			var template;
			template = options.template || '';
			return render(template, options.replace, options.at, options.css);
		}).then(resolver.resolve, resolver.reject);
	}

	/**
	 * Replaces a dom node, while preserving important attributes
	 * of the original.
	 * @private
	 * @param oldNode {HTMLElement}
	 * @param newNode {HTMLElement}
	 * @returns {HTMLElement} newNode
	 */
	function safeReplaceElement (newNode, oldNode) {
		var i, attr, newClassesRx, parent;
		for (i = 0; i < oldNode.attributes.length; i++) {
			attr = oldNode.attributes[i];
			if ('class' == attr.name) {
				// merge css classes
				// TODO: if we want to be smart about not duplicating classes, implement spliceClassNames from cola/dom/render
				newNode.className = (oldNode.className ? oldNode.className + ' ' : '')
					+ newNode.className;
			}
			else if (!newNode.hasAttribute(attr.name)) {
				newNode.setAttribute(attr.name, oldNode.getAttribute(attr.name));
			}
		}
		parent = oldNode.parentNode;
		if (parent) {
			parent.replaceChild(newNode, oldNode);
		}
		return newNode;
	}

	/**
	 * Replaces simple tokens in a string.  Tokens are in the format ${key}.
	 * Tokens are replaced by values looked up in an associated hashmap.
	 * If a token's key is not found in the hashmap, an empty string is
	 * inserted instead.
	 * @private
	 * @param template
	 * @param hashmap {Object} the names of the properties of this object
	 * are used as keys. The values replace the token in the string.
	 * @param missing {Function} callback that deals with missing properties
	 * @returns {String}
	 */
	function replaceTokens (template, hashmap, missing) {
		if (!missing) missing = blankIfMissing;
		return template.replace(parseTemplateRx, function (m, token) {
			return missing(findProperty(hashmap, token));
		});
	}

	function findProperty (obj, propPath) {
		var props, prop;
		props = propPath.split('.');
		while (obj && (prop = props.shift())) {
			obj = obj[prop];
		}
		return obj;
	}

	function nodeProxy (node) {
		if (!node.tagName || !node.setAttribute || !node.getAttribute) return;

		return {
			get: function () { /** TODO */ },
			set: function () { /** TODO */ },
			invoke: function () { /** TODO */ },
			destroy: function () {
				var parent = node.parentNode;
				if (parent) parent.removeChild(node);
			}
		};
	}

	function blankIfMissing (val) { return val == undef ? '' : val; }

	return render;

});