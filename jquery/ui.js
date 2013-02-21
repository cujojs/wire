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
define(['when', 'jquery', '../lib/proxy'], function (when, $, proxy) {

	var typeDataProp, widgetProxyMixin, undef;

	typeDataProp = 'wire$type';

	/**
	 * Creates a jQuery UI widget on top of a dom node.
	 * @param {Deferred} resolver
	 * @param {Object} spec
	 * @param {Function} wire
	 */
	function widgetFactory (resolver, spec, wire) {

		var type, widget;

		type = spec.options.type;

		if (!type) throw new Error('widget factory requires a "type" property.');

		// jQuery UI widgets place things at $[type] $.ui[type] and $.fn[type].
		// however, wijmo widgets only appear at $.fn[type].
		if (typeof $.fn[type] != 'function') {
			throw new Error('widget factory could not find a jQuery UI Widget constructor for ' + type);
		}

		widget = when.join(wire(spec.options.node), wire(spec.options.options || {}))
			.spread(createWidget);

		resolver.resolve(widget);

		function createWidget(el, options) {
			var $el;

			if (!isNode(el) && !isjQWrapped(el)) throw new Error('widget factory could not resolve "node" property: ' + spec.options.node);

			$el = $(el);
			$el.data(typeDataProp, type);

			return $el[type](options);
		}

	}

	widgetProxyMixin = {
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

			margs = [method];
			if (args && args.length) {
				// using margs's slice to ensure args is an array (instead of Arguments)
				margs = margs.concat(margs.slice.apply(args));
			}

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
		var options = $el[type]('option');
		return options && name in options;
	}

	function proxyWidget (proxy) {
		if(isWidget(proxy.target)) {
			proxy.extend(proxy, widgetProxyMixin);
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
