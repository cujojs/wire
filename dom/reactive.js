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
		jsonPath, simpleTemplate, listenForChanges, when,
		rootAttr, reactiveEvents, undef;

	render = require('./render');
	tokensToAttrs = require('../lib/dom/tokensToAttrs');
	attrsToAccessors = require('../lib/dom/attrsToAccessors');
	tokensToString = require('../lib/dom/tokensToString');
	jsonPath = require('../lib/dom/jsonPath');
	simpleTemplate = require('../lib/dom/simpleTemplate');
	listenForChanges = require('../lib/dom/listenForChanges');
	when = require('when');

	rootAttr = 'data-wire-reactroot';
	reactiveEvents = { 'onUpdate': false, 'onChange': true };

	function createReactive (template, options) {
		var frag, points, reactive, updater;

		options = options ? Object.create(options) : {};
		if (!options.on) options.on = addEventListener;

		// set the transform function. converts tokens to data via jsonPath
		options.transform = function (key, token) {
			// TODO: let dev decide how to deal with missing data
			return jsonPath(reactive.data, key);
		};
		options.replacer = tokensToAttrs;

		// replace any static tokens
		if (options.replace) {
			template = tokensToString(template, {
				transform: function (key, token) {
					var val = jsonPath(options.replace, key);
					return undef === val ? token : val;
				}
			});
		}

		// render to DOM
		frag = render(template, options);
		frag.setAttribute(rootAttr, ''); // used by isReactiveNode

		// convert the data-wire-react HTML attributes to react points
		// (aka "accessors")
		points = attrsToAccessors(frag, options);

		// create a function that will update all react points
		updater = createUpdater(points);

		reactive = {
			node: frag,
			update: function (data) {
				// save a copy for updater and any notifiers
				reactive.data = data;
				updater();
				return data;
			},
			listen: function (listener, allChanges) {
				var notifier, form;

				notifier = createNotifier(reactive.data, points, listener);

				if (allChanges) {
					return listenForChanges(options.on, frag, notifier);
				}
				else {
					form = findForm(frag, points);
					if (!form) throw new Error('cannot listen for updates without a form');
					return listenToForm(options.on, form, notifier);
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

	function createUpdater (points) {
		var updatables;
		updatables = points.filter(function (point) {
			return point.updater;
		});
		return function () {
			updatables.forEach(function (point) {
				point.updater();
			});
		};
	}

	function createNotifier (data, points, listener) {
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

	function findForm (node, points) {
		var forms, form;

		// easy case: node is a form
		if ('form' == node.nodeName) return node;

		// look for a form within this fragment
		forms = node.getElementsByTagName('form');
		if (forms.length > 0) return forms[0];

		// see if any of our reactpoints are in a form
		points.some(function (point) {
			return form = point.node && point.node.form;
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
		};
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
		var node, reactive, removers,
			origGet, origSet, origInvoke, origDestroy;

		node = proxy.target;

		if (isReactiveNode(node)) {
			// capture reactive object. when proxies are created in factory
			// this won't be necessary.
			reactive = node.wire$react;
			delete node.wire$react;

			removers = {};

			// grab originals
			origGet = proxy.get;
			origSet = proxy.set;
			origInvoke = proxy.invoke;
			origDestroy = proxy.destroy;

			proxy.get = function (key) {
				if ('update' == key) {
					return reactive.update;
				}
				else if (key in reactiveEvents) {
					return getEventHandler(key);
				}
				else return origGet.apply(this, arguments);
			};

			proxy.set = function (key, value) {
				if ('update' == key) {
					return reactive.update = value;
				}
				else if (key in reactiveEvents) {
					removeEventHandler(key);
					return getEventHandler(key);
				}
				else return origSet.apply(this, arguments);
			};

			proxy.invoke = function (method, args) {
				if ('update' == method) {
					return reactive.update.apply(this, args);
				}
				else if (method in reactiveEvents) {
					return getEventHandler(method).apply(this, args);
				}
				else return origInvoke.apply(this, arguments);
			};

			proxy.destroy = function () {
				reactive.unlisten();
				removeEventHandler('onUpdate');
				removeEventHandler('onChange');
				return origDestroy.apply(this, arguments);
			};

			return proxy;
		}

		function getEventHandler (name) {
			// create a reactive listener, if needed
			if (!reactive[name]) {
				// create a stub
				reactive[name] = function (data) { return data; };
				// create a listener
				removers[name] = reactive.listen(
					function (data) { return reactive[name](data); },
					reactiveEvents[name] // boolean
				);
			}
		}

		function removeEventHandler (name) {
			if (removers[name]) removers[name]();
			delete removers[name];
		}
	}

	function isReactiveNode (node) {
		return node.getAttribute
			&& node.getAttribute(rootAttr) != null;
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));