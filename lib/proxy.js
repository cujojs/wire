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

	function WireProxy(target, lifecycle, metadata) {
		this.id = metadata && metadata.id;
		this.target = target;
		this._lifecycle = lifecycle;
		this.metadata = metadata;
	}

	WireProxy.prototype = {
		get: function(property) {
			return this.target[property];
		},

		set: function(property, value) {
			this.target[property] = value;
			return value;
		},

		invoke: function(method, args) {
			var target = this.target;

			if(typeof method === 'string') {
				method = target[method];
			}

			return method.apply(target, array.fromArguments(args));
		},

		init: function() {
			return this._lifecycle.init(this);
		},

		startup: function() {
			return this._lifecycle.startup(this);
		},

		shutdown: function() {
			return this._lifecycle.shutdown(this);
		},

		destroy: function() {},

		clone: function(options) {
			// don't try to clone a primitive
			var target = this.target;

			if (typeof target == 'function') {
				// cloneThing doesn't clone functions, so clone here:
				return target.bind();
			} else if (typeof target != 'object') {
				return target;
			}

			return cloneThing(target, options || {});
		}
	};

	return {
		create: createProxy,
		isProxy: isProxy,
		getTarget: getTarget,
		extend: extendProxy
	};

	function createProxy(target, lifecycle, metadata) {
		return new WireProxy(target, lifecycle, metadata);
	}

	function extendProxy(proxy, extensions) {
		return object.mixin(Object.create(proxy), extensions);
	}

	function isProxy(it) {
		return it instanceof WireProxy;
	}

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