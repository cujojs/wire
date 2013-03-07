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
			var reactAttr, pointDefs;

			reactAttr = node.getAttribute('data-wire-reactpoint');
			pointDefs = reactAttr.split(';');

			pointDefs.forEach(function (def) {
				var parts, path, attr, parsed, point, updater;
				parts = def.split(':', 2);
				attr = parts[0];
				parsed = templates.parse(parts[1]);

				if ('text' == attr) {
					// elements that have a "text:" data-wire-reactpoint.
					// switch element with a text node
					node = replaceWithTextNode(node);
				}

				point = {
					path: path,
					node: node,
					attr: attr
				};
				list.push(point);

				if (parsed.length > 1) {
					point.updater = createCompositeUpdater(parsed);
				}
				else {
					path = parsed[0].token;
					point.updater = createUpdater(node, attr, path);
					point.getter = createGetter(node, attr);
				}
			});

			return list;
		}, []);
	}

	function createCompositeUpdater (parsed) {
		return function (stringify) {
			return templates.exec(parsed, stringify);
		};
	}

	function createUpdater (node, attr, key) {
		if ('text' == attr) return function (stringify) {
			node.data = stringify(key);
		};
		else if ('html' == attr) return function (stringify) {
			node.innerHTML = stringify(key);
		};
		else return function (stringify) {
			var value = stringify(key);
			if (attr in node) node[attr] = value;
			else node.setAttribute(attr, value);
		};
	}

	function createGetter (node, attr) {
		if ('text' == attr) return function () {
			return node.data;
		};
		else if ('html' == attr) return function () {
			return node.innerHTML = value;
		};
		else return function () {
			if (attr in node) node[attr] = value;
			else node.setAttribute(attr, value);
			return value;
		};
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