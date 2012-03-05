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

define(['when', '../domReady'], function(when, domReady) {

	var parentTypes, parseTemplateRx, getFirstTagNameRx, undef;

	parentTypes = {
		'td': 'tr',
		'tr': 'tbody',
		'tbody': 'table',
		'li': 'ul'
		// TODO: finish this list
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
		var node, parentType;

		// replace tokens (before attempting to find top tag name)
		template = replaceTokens(template, hashmap);

		// get parent tag type
		parentType = getParentTagName(template);

		node = createTemplatedNode(template, parentType);

		if (optRefNode) {
			node = safeReplaceNode(node, optRefNode);
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

	return render;


	/**
	 * Creates rendered dom trees for the "render" factory.
	 * @param resolver
	 * @param spec
	 * @param wire
	 */
	function domRenderFactory(resolver, spec, wire) {
		var options = spec.render;

		domReady(function() {

			var futureTemplate, futureMixin, futureRoot, futureCss;

			// get args from spec
			futureTemplate = options.template ? wire(options.template) : '';
			if (options.mixin) {
				futureMixin = wire(options.mixin);
			}
			if (options.at) {
				futureRoot = wire(options.at);
			}
			if (options.css) {
				futureCss = wire(options.css);
			}

			when.all([futureTemplate, futureMixin, futureRoot, futureCss], function (args) {
				return render.apply(undef, args);
			}).then(resolver.resolve, resolver.reject);

		});
	}

	/**
	 * Finds the first html element in a string, extracts its tag name,
	 * and looks up the natural parent element tag name for this element.
	 * @param template {String}
	 * @returns {String} the parent tag name, or 'div' if none was found.
	 */
	function getParentTagName (template) {
		var matches;
		// TODO: throw if no element was ever found
		matches = template.match(getFirstTagNameRx);
		return parentTypes[matches && matches[1]] || 'div';
	}

	/**
	 * Creates a node from a text template.
	 * @private
	 * @param template
	 * @param parentTagName
	 * @returns {DOMNode} the root node created from the template
	 */
	function createTemplatedNode (template, parentTagName) {
		var parent = document.createElement(parentTagName);
		parent.innerHTML = template;
		// just return first node (templates that use nodelists are tricky)
		return parent.childNodes[0];
	}

	/**
	 * Replaces a dom node, while preserving important attributes
	 * of the original.
	 * @private
	 * @param oldNode {DOMNode}
	 * @param newNode {DOMNode}
	 * @returns {DOMNode} newNode
	 */
	function safeReplaceNode (newNode, oldNode) {
		var i, attr, newClassesRx, parent;
		for (i = 0; i < oldNode.attributes.length; i++) {
			attr = oldNode.attributes[i];
			if ('class' == attr.name) {
				// merge css classes
				newClassesRx = new RegExp(newNode.className.replace(' ', '|'));
				newNode.className = oldNode.className.replace(newClassesRx, '') + ' ' + newNode.className;
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
	 * @param transform {Function} callback that can
	 * @returns {String}
	 */
	function replaceTokens (template, hashmap, transform) {
		if (!transform) transform = blankIfMissing;
		return template.replace(parseTemplateRx, function (m, token) {
			return transform(hashmap && hashmap[token]);
		});
	}

	function nodeProxy(node) {
		if(!node.tagName || !node.setAttribute || !node.getAttribute) return;

		return {
			get: function() { /** TODO */ },
			set: function() { /** TODO */ },
			invoke: function() { /** TODO */ },
			destroy: function() {
				var parent = node.parentNode;
				if(parent) parent.removeChild(node);
			}
		};
	}

	function blankIfMissing (val) { return val || ''; }

});