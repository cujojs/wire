/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function(require) {

	var object, array;

	object = require('./object');
	array = require('./array');

	/**
	 * A base proxy for all components that wire creates.  It allows wire's
	 * internals and plugins to work with components using a standard interface.
	 * WireProxy instances may be extended to specialize the behavior of the
	 * interface for a particular type of component.  For example, there is a
	 * specialized version for DOM Nodes.
	 * @param {*} target value to be proxied
	 *  instance being proxied
	 * @constructor
	 */
	function WireProxy(target) {
		this.target = target;
	}

	WireProxy.prototype = Object.create({
		init: function () {
			return this._lifecycle.init(this);
		},

		startup: function () {
			return this._lifecycle.startup(this);
		},

		shutdown: function () {
			return this._lifecycle.shutdown(this);
		},

		destroy: function () {}
	});

	WireProxy.prototype.get = function (property) {
		return this.target[property];
	};

	WireProxy.prototype.set = function (property, value) {
		this.target[property] = value;
		return value;
	};

	WireProxy.prototype.invoke = function (method, args) {
		var target = this.target;

		if (typeof method === 'string') {
			method = target[method];
		}

		return method.apply(target, array.fromArguments(args));
	};

	WireProxy.prototype.clone = function (options) {
		// don't try to clone a primitive
		var target = this.target;

		if (typeof target == 'function') {
			// cloneThing doesn't clone functions, so clone here:
			return target.bind();
		} else if (typeof target != 'object') {
			return target;
		}

		return cloneThing(target, options || {});
	};

	WireProxy.create = createProxy;
	WireProxy.init = initProxy;
	WireProxy.isProxy = isProxy;
	WireProxy.getTarget = getTarget;
	WireProxy.extend = extendProxy;

	return WireProxy;

	/**
	 * Creates a new WireProxy for the supplied target. See WireProxy
	 * @param {*} target value to be proxied
	 * @returns {WireProxy}
	 */
	function createProxy(target) {
		return new WireProxy(target);
	}

	/**
	 * @param {WireProxy} proxy
	 * @param {Lifecycle} lifecycle lifecycle processor for the target component
	 * @param {Object} metadata metadata that was used to create the target component
	 *  instance being proxied
	 * @returns {WireProxy} proxy
	 */
	function initProxy(proxy, lifecycle, metadata) {
		if(metadata) {
			proxy.id = metadata.id;
			proxy.metadata = metadata;
		}

		Object.defineProperty(proxy, '_lifecycle', { value: lifecycle });

		return proxy;
	}

	/**
	 * Returns a new WireProxy, whose prototype is proxy, with extensions
	 * as own properties.  This is the "official" way to extend the functionality
	 * of an existing WireProxy.
	 * @param {WireProxy} proxy proxy to extend
	 * @param extensions
	 * @returns {*}
	 */
	function extendProxy(proxy, extensions) {
		if(!isProxy(proxy)) {
			throw new Error('Cannot extend non-WireProxy');
		}

		return object.mixin(Object.create(proxy), extensions);
	}

	/**
	 * Returns true if it is a WireProxy
	 * @param {*} it
	 * @returns {boolean}
	 */
	function isProxy(it) {
		return it instanceof WireProxy;
	}

	/**
	 * If it is a WireProxy (see isProxy), returns it's target.  Otherwise,
	 * returns it;
	 * @param {*} it
	 * @returns {*}
	 */
	function getTarget(it) {
		return isProxy(it) ? it.target : it;
	}

	function cloneThing (thing, options) {
		var deep, inherited, clone, prop;
		deep = options.deep;
		inherited = options.inherited;

		// Note: this filters out primitive properties and methods
		if (typeof thing != 'object') {
			return thing;
		}
		else if (thing instanceof Date) {
			return new Date(thing.getTime());
		}
		else if (thing instanceof RegExp) {
			return new RegExp(thing);
		}
		else if (Array.isArray(thing)) {
			return deep
				? thing.map(function (i) { return cloneThing(i, options); })
				: thing.slice();
		}
		else {
			clone = thing.constructor ? new thing.constructor() : {};
			for (prop in thing) {
				if (inherited || object.hasOwn(thing, prop)) {
					clone[prop] = deep
						? cloneThing(thing[prop], options)
						: thing[prop];
				}
			}
			return clone;
		}
	}

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(factory) { module.exports = factory(require); }
);