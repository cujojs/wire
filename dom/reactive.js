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

	var findReactiveBitsRx, findReactPoints, listener;

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

	listener = document && document.addEventListener
		? addEventListener
		: attachEvent;

	/***** copied from cola/dom/guess *****/

	var formValueNodeRx = /^(input|select|textarea)$/i;
	var formClickableRx = /^(checkbox|radio)/i;

	/***** export *****/

	function reactive (template, options) {
		var frag, reactMap, reactor;

		if (!options.replacer) options.replacer = replaceTokens;
		if (!options.listener) options.listener = listener;

		frag = render(template, options);
		frag.setAttribute('wire-react-root', '');
		reactMap = mapReactPoints(findReactPoints(frag));

		reactor = {
			node: frag,
			update: function (data) {
				// save a copy
				reactor.data = data;
				// push to DOM
				Object.keys(data).forEach(function (key) {
					// TODO: make this work for jsonPath keys
					if (reactMap[key]) {
						reactMap[key].accessor(data[key]);
					}
					else {
						// TODO: how does the dev want us to handle missing items?
					}
				});
				return data;
			},
			onUpdate: function (data) {
				// this is just a stub that should get AOP'ed
				return data;
			}
		};

		// create listeners for all react points that have listenable events
		// and call onUpdate()
		reactor.unlisten = addListeners(reactMap, function () {
			var changed;
			Object.keys(reactMap).reduce(function (data, key) {
				var newVal;
				// TODO: make this work for jsonPath keys
				newVal = reactMap[key].accessor();
				changed |= newVal != data[key];
				data[key] = newVal;
			}, reactor.data);
			if (changed) reactor.onUpdate(data);
		});

		return reactor;
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

	/***** templating *****/

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

	/***** wire *****/

	function reactorFactory (resolver, componentDef, wire) {
		when(wire(componentDef.options), function (options) {
			var template, reactor;
			template = options.template;
			if (!template) {
				template = options;
				options = {};
			}
			reactor = reactive(template, options);
			// temporary property, see proxyReactor below
			reactor.node.WireReact = reactor;
			return reactor.node;
		}).then(resolver.resolve, resolver.reject);
	}

	function proxyReactor (proxy) {
		var node, reactor, origGet, origSet, origInvoke, origDestroy;

		node = proxy.target;

		if (isReactiveNode(node)) {
			// capture reactor. when proxies are created in factory
			// this won't be necessary.
			reactor = node.WireReact;
			delete node.WireReact;

			// proxy getter to return update
			origGet = proxy.get;
			proxy.get = function (key) {
				if ('update' == key) {
					return reactor.update;
				}
				else if ('onUpdate' == key) {
					return reactor.onUpdate;
				}
				else return origGet.apply(this, arguments);
			};

			// proxy setter to set onUpdate
			origGet = proxy.get;
			proxy.set = function (key, value) {
				if ('onUpdate' == key) {
					return reactor.onUpdate;
				}
				else return origGet.apply(this, arguments);
			};

			// proxy invoke to add an update() method
			origInvoke = proxy.invoke;
			proxy.invoke = function (method, args) {
				if ('update' == method) {
					return reactor.update.apply(this, args);
				}
				else if ('onUpdate' == method) {
					return reactor.onUpdate.apply(this, args);
				}
				else return origInvoke.apply(this, arguments);
			};

			// proxy destroy
			origDestroy = proxy.destroy;
			proxy.destroy = function () {
				return reactor.unlisten();
			}
		}
		return proxy;
	}

	function isReactiveNode (node) {
		return node.getAttribute
			&& node.getAttribute('wire-react-root') != null;
	}

	/***** event handling *****/

	function addListeners (map, listener) {
		Object.keys(map).forEach(function (key) {
			var point, events;
			point = map[key];
			events = guessEventsFor(point.node);
			if (events.length) {
				point.remove = listenAll(point.node, events, listener);
			}
		});
	}

	function listenAll (node, events, callback) {
		var unlisteners;
		unlisteners = events.map(function (event) {
			return listener(node, event, callback);
		});
		return function () {
			unlisteners.forEach(function (unlisten) {
				unlisten();
			});
		}
	}

	function addEventListener (node, event, listener, useCapture) {
		node.addEventListener(event, listener, useCapture);
		return function () {
			node.removeEventListener(event, listener, useCapture);
		}
	}

	function attachEvent (node, event, listener, useCapture) {
		node.attachEvent(event, listener);
		return function () {
			node.detachEvent(event, listener);
		}
	}

	/***** copied from cola/dom/guess *****/

	function isFormValueNode (node) {
		return formValueNodeRx.test(node.tagName);
	}

	function isClickableFormNode (node) {
		return isFormValueNode(node) && formClickableRx.test(node.type);
	}

	function guessEventsFor (node) {
		if (Array.isArray(node)) {
			// get unique list of events
			return node.reduce(function (events, node) {
				return events.concat(guessEventsFor(node).filter(function (event) {
					return event && events.indexOf(event) < 0;
				}));
			},[]);
		}
		else if (isFormValueNode(node)) {
			return [isClickableFormNode(node) ? 'click' : 'change', 'focusout'];
		}

		return [];
	}


});
