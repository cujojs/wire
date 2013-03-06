/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom/reactive/attrsToAccessors
 * finds nodes with data-wire-reactpoints attrs and returns a map of
 * accessor functions.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function (define) {
define(function (require) {

	var templates;

	templates = require('./template');

	function attrsToAccessors (root, options) {
		if (!options.querySelectorAll) options.querySelectorAll = querySelectorAll;
		return createReactPoints(findReactPoints(root, options));
	}

	return attrsToAccessors;

	function findReactPoints (root, options) {
		var nodes = options.querySelectorAll(root, '[data-wire-reactpoint]');
		// we need poly/array to support Array.from:
		nodes = Array.prototype.slice.call(nodes);
		// qsa doesn't check the root node
		if (root.getAttribute('data-wire-reactpoint') != null) {
			nodes.unshift(root);
		}
		return nodes;
	}

	function querySelectorAll (node, selector) {
		return node.querySelectorAll(selector);
	}

	// data-wire-reactpoint="attr1:template1;attr2:template2"

	function createReactPoints (nodes) {
		return nodes.reduce(function (list, node) {
			var reactAttr, points;

			reactAttr = node.getAttribute('data-wire-reactpoint');
			points = reactAttr.split(';');

			points.forEach(function (point) {
				var parts, path, attr, parsed, accessor;
				parts = point.split(':', 2);
				attr = parts[0];
				parsed = templates.parse(parts[1]);

				if (parsed.length > 0) {
					// template
					list.push({
						node: node,
						attr: attr,
						updater: createCompositeUpdater(parsed)
					});
				}
				else {

					path = parsed[1];

					if ('text' == attr) {
						// elements that have a "text:" data-wire-reactpoint.
						// switch element with a text node
						node = replaceWithTextNode(node);
						accessor = createTextNodeAccessor(node);
					}
					else if (attr in node) {
						accessor = createPropAccessor(node, attr);
					}
					else {
						accessor = createAttrAccessor(node, attr);
					}

					list.push({
						path: path,
						node: node,
						attr: attr,
						accessor: accessor
					});

				}
			});

			return list;
		}, []);
	}

	function createCompositeUpdater (parsed) {
		return function (stringify, data) {
			if (arguments.length < 1) throw new Error('cannot get composite value from template.');
			return templates.exec(parsed, stringify);
		};
	}

	function createTextNodeAccessor (node) {
		return function (value) {
			if (arguments.length > 0) node.data = value;
			return node.data;
		};
	}

	function createPropAccessor (node, attr) {
		return function (value) {
			if (arguments.length > 0) node[attr] = value;
			return node[attr];
		};
	}

	function createAttrAccessor (node, attr) {
		return function (value) {
			if (arguments.length > 0) node.setAttribute(attr);
			return node.getAttribute(attr);
		}
	}

	function replaceWithTextNode (node) {
		var parent, text;
		// switch element with a text node
		parent = node.parentNode;
		text = node.ownerDocument.createTextNode('');
		parent.insertBefore(text, node);
		parent.removeChild(node);
		return text;
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));