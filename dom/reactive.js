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
(function (define) {
define(function (require) {
	var render, tokensToAttrs, attrsToAccessors, tokensToString,
		stringifyJsonPath, simpleTemplate, when;

	render = require('./render');
	tokensToAttrs = require('./reactive/tokensToAttrs');
	attrsToAccessors = require('./reactive/attrsToAccessors');
	tokensToString = require('./reactive/tokensToString');
	stringifyJsonPath = require('./reactive/stringifyJsonPath');
	simpleTemplate = require('./reactive/simpleTemplate');
	when = require('when');

	/***** copied from cola/dom/guess *****/

	var formValueNodeRx = /^(input|select|textarea)$/i;
	var formClickableRx = /^(checkbox|radio)/i;

	/***** export *****/

	// TODO: create a module that will find event listeners
	// TODO: convert wire/dom/reactive to just a plugin

	function createReactive (template, options) {
		var frag, points, reactive;

		if (!options) options = {};
		if (!options.replacer) options.replacer = tokensToAttrs;
		if (!options.addEventListener) options.addEventListener = addEventListener;

		// TODO: deal with missing data
		options.stringify = function (key) { return reactive.data[key]; };

		if (options.replace) {
			template = tokensToString(template, {
				stringify: function (key) {
					return stringifyJsonPath(options.replace, key);
				}
			});
		}
		options.replacer = tokensToAttrs;
		frag = render(template, options);
		//frag.setAttribute('wire-react-root', '');
		points = attrsToAccessors(frag, options);

		reactive = {
			node: frag,
			update: function (data) {
				// save a copy for onUpdate
				reactive.data = data;
				// push to DOM
				points.forEach(function (point) {
					// TODO: devise a configurable way to know when to call updater
					if (!('key' in point) || data[point.key] !== undefined) {
						if (point.updater) {
							point.updater();
						}
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
		reactive.unlisten = addListeners(points, function () {
			var changed;
			points.reduce(function (data, point) {
				var newVal;
				// TODO: make this work for jsonPath keys
				if (point.getter) {
					newVal = point.getter();
					if (newVal != data[point.key]) {
						changed = true;
						data[point.key] = newVal;
					}
				}
				return data;
			}, reactive.data);
			if (changed) reactive.onUpdate(reactive.data);
		}, options.addEventListener);

		return reactive;
	}

	createReactive.wire$plugin = function () {
		return {
			factories: {
				reactive: reactiveFactory
			},
			proxies: [
				proxyReactive
			]
		}
	};

	return createReactive;

	/***** wire *****/

	function reactiveFactory (resolver, componentDef, wire) {
		when(wire(componentDef.options), function (options) {
			var template, reactive;

			if (typeof options == 'string') {
				// string shortcut
				template = options;
				options = {};
			}
			else {
				template = options.template;
			}

			// TODO: try to obtain a default dom event handler { $ref: 'on!' }

			reactive = createReactive(template, options);

			// temporary property, see proxyReactive below
			reactive.node.wire$react = reactive;
			return reactive.node;
		}).then(resolver.resolve, resolver.reject);
	}

	function proxyReactive (proxy) {
		var node, reactive, origGet, origSet, origInvoke, origDestroy;

		node = proxy.target;

		if (isReactiveNode(node)) {
			// capture reactive object. when proxies are created in factory
			// this won't be necessary.
			reactive = node.wire$react;
			delete node.wire$react;

			// proxy getter to return update
			origGet = proxy.get;
			proxy.get = function (key) {
				if ('update' == key) {
					return reactive.update;
				}
				else if ('onUpdate' == key) {
					return reactive.onUpdate;
				}
				else return origGet.apply(this, arguments);
			};

			// proxy setter to set onUpdate
			origSet = proxy.get;
			proxy.set = function (key, value) {
				if ('onUpdate' == key) {
					return reactive.onUpdate;
				}
				else return origSet.apply(this, arguments);
			};

			// proxy invoke to add an update() method
			origInvoke = proxy.invoke;
			proxy.invoke = function (method, args) {
				if ('update' == method) {
					return reactive.update.apply(this, args);
				}
				else if ('onUpdate' == method) {
					return reactive.onUpdate.apply(this, args);
				}
				else return origInvoke.apply(this, arguments);
			};

			// proxy destroy
			origDestroy = proxy.destroy;
			proxy.destroy = function () {
				reactive.unlisten();
				return origDestroy.apply(this, arguments);
			};

			return proxy;
		}
	}

	function isReactiveNode (node) {
		return node.getAttribute
			&& node.getAttribute('wire-react-root') != null;
	}

	/***** event handling *****/

	function addListeners (map, callback, listener) {
		Object.keys(map).forEach(function (key) {
			var point, events;
			point = map[key];
			events = guessEventsFor(point.node);
			if (events.length) {
				point.remove = listenAll(point.node, events, callback, listener);
			}
		});
	}

	function listenAll (node, events, callback, listener) {
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

	function addEventListener (node, event, callback, useCapture) {
		node.addEventListener(event, callback, useCapture);
		return function () {
			node.removeEventListener(event, callback, useCapture);
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
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));