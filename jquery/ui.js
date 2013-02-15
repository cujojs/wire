/** @license MIT License (c) copyright 2011-2013 original author or authors */

/**
 * Allows declarative creation of jQuery UI widgets.
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * @author Brian Cavalier
 * @author John Hann
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
define(['when', 'jquery'], function (when, $) {

	var undef, typeDataProp;

	typeDataProp = 'wire$type';

	/**
	 * Creates a jQuery UI widget on top of a dom node.
	 * @param {Deferred} resolver
	 * @param {Object} spec
	 * @param {Function} wire
	 */
	function widgetFactory (resolver, spec, wire) {

		var type;

		try {

			type = spec.options.type;

			if (!type) throw new Error('widget factory requires a "type" property.');

			if (typeof $.ui[type] != 'function') {
				throw new Error('widget factory could not find a jQuery UI Widget constructor for ' + type);
			}

			when.all([wire(spec.options.node), wire(spec.options.options || {})], function (wired) {
				var $el, options;

				if (!isNode(wired[0]) && !isjQWrapped(wired[0])) throw new Error('widget factory could not resolve "node" property: ' + spec.options.node);

				$el = $(wired[0]);
				options = wired[1];

				$el.data(typeDataProp, type);

				return $el[type](options);

			}).then(resolver.resolve, resolver.reject);

		}
		catch (ex) {
			resolver.reject(ex);
		}

	}

	function WidgetProxy () {}

	WidgetProxy.prototype = {
		get: function (name) {
			var $el = this.target, type = $el.data(typeDataProp), value;

			// if there is a method with this name, call it to get value
			if (typeof $el[name] == 'function') return $el[name]();

			// if there is an option (not undefined), then return that
			if (hasOption($el, type, name)) return $el[type]('option', name);

			// try an element property
			value = $el.prop(name);
			if (undef !== value) return value;

			// try an element attribute
			return $el.attr(name);

		},

		set: function (name, value) {
			var $el = this.target, type = $el.data(typeDataProp);

			// if there is a function with this name, call it to set value
			if (typeof $el[name] == 'function') return $el[name](value);

			// if there is an option (not undefined), set it
			if (hasOption($el, type, name)) return $el[type]('option', name, value);

			// try an element property
			if (undef !== $el.prop(name)) return $el.prop(name, value);

			// try an element attribute
			return $el.attr(name, value);

		},

		invoke: function (method, args) {
			var $el = this.target, type = $el.data(typeDataProp), margs;

			margs = args && args.length ? [method].concat(args) : [method];

			return $el[type].apply($el, margs);
		},

		destroy: function () {
			var $el = this.target;
			$el.destroy();
		},

		clone: function (options) {
			var $el = this.target;
			// default is to clone deep (when would anybody not want deep?)
			return $el.clone(!('deep' in options) || options.deep);
		}

	};

	function hasOption ($el, type, name) {
		// thankfully, all options should be pre-defined in a jquery ui widget
		var options = $el[type]('options');
		return options && name in options;
	}

	function proxyWidget (proxy) {
		var object = proxy.target;

		if (proxy instanceof WidgetProxy || !isWidget(object)) {
			return proxy;
		}
		else {
			return new WidgetProxy();
		}
	}

	function isWidget (it) {
		return it
			&& it.data
			&& !!it.data(typeDataProp);
	}

	function isNode(it) {
		return typeof Node == 'object'
			? it instanceof Node
			: it && typeof it == 'object' && typeof it.nodeType == 'number' && typeof it.nodeName == 'string';
	}

	function isjQWrapped (it) {
		return typeof it == 'function' && typeof it.jquery == 'function';
	}

	/*** Plugin Definition ***/

	return {
		wire$plugin: function jQueryUIPlugin (ready, destroy, options) {
			return {
				factories: {
					widget: widgetFactory
				},
				proxies: [
					proxyWidget
				]
			};
		}
	};

});
