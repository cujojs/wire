/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(function() {
	"use strict";

	function Proxy() {}

	Proxy.prototype = {
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

			return method.apply(target, args);
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
		extend: extendProxy
	};

	function createProxy(target) {
		return Object.create(Proxy.prototype, {
			target: {
				value: target,
				writable: false,
				configurable: false,
				enumerable: false
			}
		});
	}

	function extendProxy(base, overrides) {
		// TODO

		return base;
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
				if (inherited || thing.hasOwnProperty(prop)) {
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
	: function(factory) { module.exports = factory(); }
);