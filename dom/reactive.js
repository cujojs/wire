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
		jsonPath, simpleTemplate, listenForChanges, when;

	render = require('./render');
	tokensToAttrs = require('../lib/dom/tokensToAttrs');
	attrsToAccessors = require('../lib/dom/attrsToAccessors');
	tokensToString = require('../lib/dom/tokensToString');
	jsonPath = require('../lib/dom/jsonPath');
	simpleTemplate = require('../lib/dom/simpleTemplate');
	listenForChanges = require('../lib/dom/listenForChanges');
	when = require('when');

	// TODO: convert wire/dom/reactive and wire/dom/render to just plugins

	function createReactive (template, options) {
		var frag, points, reactive;

		options = options ? Object.create(options) : {};
		if (!options.on) options.on = addEventListener;

		// TODO: deal with missing data
		options.stringify = function (key) { return reactive.data[key]; };

		if (options.replace) {
			template = tokensToString(template, {
				stringify: function (key) {
					return jsonPath(options.replace, key);
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
			listen: function (listener, allChanges) {
				var updater, form;

				updater = createUpdater(reactive.data, points, listener);

				if (allChanges) {
					return listenForChanges(options.on, frag, updater);
				}
				else {
					form = findForm(points);
					if (!form) throw new Error('cannot listen for updates without a form');
					return listenToForm(options.on, form, updater);
				}
			}
		};

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

	function createUpdater (data, points, listener) {
		return function () {
			var changed;
			points.reduce(function (data, point) {
				var newVal, oldVal;
				if (point.getter) {
					newVal = point.getter();
					oldVal = jsonPath(data, point.key);
					if (newVal != oldVal) {
						changed = true;
						jsonPath(data, point.key, newVal);
					}
				}
				return data;
			}, data);
			if (changed) listener(data);
		}
	}

	function findForm (points) {
		var form;
		points.some(function (point) {
			return point.node && point.node.form;
		});
		return form;
	}

	function listenToForm (on, form, listener) {
		var unlisten1, unlisten2;
		unlisten1 = on(form, 'submit', listener);
		unlisten2 = on(form, 'reset' ,listener);
		return function unlisten () {
			unlisten1();
			unlisten2();
		};
	}

	function addEventListener (node, event, callback, useCapture) {
		node.addEventListener(event, callback, useCapture);
		return function () {
			node.removeEventListener(event, callback, useCapture);
		}
	}

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

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));