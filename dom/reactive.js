/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom/reactive plugin
 * wire plugin that provides a factory for reactive dom fragments
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['./render', 'when'], function (render, when) {

	var findReactiveBitsRx, findReactPoints;

	// finds ${jsonPath} inside attrs and text.
	// attrName="${jsonPath}" or just ${jsonPath} in text
	// TODO: allow <tag ${dynamicAttrName} /> too (aka boolean attrs)
	// TODO: allow more than one attr="${path}" per tag
	// TODO: this needs to be a bit more robust. it can falsely think it's inside a tag
	// TODO: allow this to match *part* of an attribute's value, too
	findReactiveBitsRx = /([_$a-zA-Z][_$a-zA-Z0-9]*)\s*=\s*"?\$\{([^}]*)\}"?|\$\{([^}]*)\}/;

	// it would be nice to use the dom.all! ref resolver here, but
	// then we can't use the reactive() function outside of the factory
	findReactPoints = document && document.querySelectorAll
		? findReactPointsByQsa
		: findReactPointsByTraversal;

	function reactive (template, options) {
		var frag, reactMap;

		// call render() with our replaceTokens
		if (!options.replacer) options.replacer = replaceTokens;
		frag = render(template, options);
		reactMap = mapReactPoints(findReactPoints(frag));

		return {
			node: frag,
			binder: function (data) {
				Object.keys(data).forEach(function (key) {
					if (reactMap[key]) {
						reactMap[key].accessor(data[key]);
					}
					else {
						// TODO: how does the dev want us to handle missing items?
					}
				});
			}
		};
	}

	reactive.wire$plugin = function () {
		return {
			factories: {
				reactor: reactorFactory
			},
			proxies: [
				proxyReactor
			]
		}
	};

	return reactive;

	/**
	 * Replaces tokens in a string with dom nodes.
	 * @private
	 * @param {String} template
	 * @param {Object} options
	 * @returns {String}
	 */
	function replaceTokens (template, options) {
		return template.replace(findReactiveBitsRx, function (m, attrName, attrToken, token) {
			if (attrName) {
				return 'data-wire-reactpoint="' + attrName + ':' + attrToken + '"';
			}
			else {
				// insert inline element tag referencing the token.
				return '<span data-wire-reactpoint="text:' + token + '"></span>';
			}
		});
	}

	function findReactPointsByQsa (root) {
		var nodes = root.querySelectorAll('[data-wire-reactpoint]');
		// we need poly/array to support Array.from:
		return Array.prototype.slice.call(nodes);
	}

	function findReactPointsByTraversal (root) {
		// TODO: findReactPointsByTraversal
	}

	function mapReactPoints (nodes) {
		return nodes.reduce(function (map, node) {
			var reactAttr, parent, text, parts, path, attr, accessor;

			reactAttr = node.getAttribute('data-wire-reactpoint');
			parts = reactAttr.split(':', 2);
			attr = parts[0];
			path = parts[1];

			// convert elements that have a "text:" data-wire-reactpoint to
			// text nodes
			if ('text' == attr) {
				// switch element with a text node
				parent = node.parentNode;
				text = node.ownerDocument.createTextNode('');
				parent.insertBefore(text, node);
				parent.removeChild(node);
				// use text node and its data property
				node = text;
				accessor = createTextNodeAccessor(text);
			}
			else if (attr in node) {
				accessor = createPropAccessor(node, attr);
			}
			else {
				accessor = createAttrAccessor(node, attr);
			}

			map[path] = {
				node: node,
				attr: attr,
				accessor: accessor
			};

			return map;
		}, {});
	}

	function createTextNodeAccessor (node) {
		return function (data) {
			if (arguments.length > 0) node.data = data;
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

	function reactorFactory (resolver, componentDef, wire) {
		when(wire(componentDef.options), function (options) {
			var template, reactor;
			template = options.template;
			if (!template) {
				template = options;
				options = {};
			}
			reactor = reactive(template, options);
			reactor.node.setAttribute('wire-react-root', '');
			// temporary property, see proxyReactor below
			reactor.node.WireReact = reactor.binder;
			return reactor.node;
		}).then(resolver.resolve, resolver.reject);
	}

	function proxyReactor (proxy) {
		var node, binder, origGet, origInvoke;

		node = proxy.target;

		if (isReactiveNode(node)) {
			// capture binder function. when proxies are created in factory
			// this won't be necessary.
			binder = node.WireReact;
			delete node.WireReact;

			// proxy getter to return binder
			origGet = proxy.get;
			proxy.get = function (key, value) {
				if ('binder' == key) {
					return binder;
				}
				return origGet.apply(this, arguments);
			};

			// proxy invoke to add an update() method
			origInvoke = proxy.invoke;
			proxy.invoke = function (method, args) {
				if ('update' == method) {
					return binder.apply(this, args);
				}
				else return origInvoke.apply(this, arguments);
			};
		}
		return proxy;
	}

	function isReactiveNode (node) {
		return node.getAttribute
			&& node.getAttribute('wire-react-root') != null;
	}

});
