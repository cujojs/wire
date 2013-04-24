/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function(require) {

	var when, meld, paramsRx, splitRx, autowirePlugin;

	when = require('when');
	meld = require('meld');

	paramsRx = /\(([^)]+)/;
	splitRx = /\s*,\s*/;

	autowirePlugin = {
		'configure:before': function(resolver, proxy, wire) {
			var p = autowireProperties(wire.resolveRef, {}, proxy).then(function() {
				return autowireParameters(wire.resolveRef, {}, proxy)
			});

			resolver.resolve(p);
		}
	};

	return function() {
		return autowirePlugin;
	};

	function defaultNameMapper(t, p) {
		return /^[$]\S+/.test(p) ? p.slice(1) : null;
	}

	function failIfMissing(e) {
		throw e;
	}

	function noop() {}

	function autowireProperties(resolveRef, options, proxy) {
		var target, promises, prop, name, mapName, handleMissing;

		target = proxy.target;
		if(isNode(target)) {
			return when.resolve();
		}

		promises = [];
		mapName = options.mapName || defaultNameMapper;
		handleMissing = options.fail ? failIfMissing : noop;

		for(prop in target) {
			name = mapName(target, prop);
			if(name) {
				promises.push(when.join(prop, resolveRef(name))
					.spread(function(prop, val) {
						proxy.set(prop, val);
					})
					.otherwise(handleMissing)
				);
			}
		}

		return when.all(promises);
	}

	function autowireParameters(resolveRef, options, proxy) {
		var target, promises, prop;

		target = proxy.target;
		if(isNode(target)) {
			return when.resolve();
		}

		promises = [];

		for(prop in target) {
			if (typeof proxy.get(prop) === 'function') {
				promises.push(autowireMethodParams(resolveRef, options, proxy, prop));
			}
		}

		return when.all(promises);
	}

	function autowireMethodParams(resolveRef, options, proxy, methodName) {
		var target, method, promise, names, injectedArgs, mapName, handleMissing;

		target = proxy.target;
		method = proxy.get(methodName);

		if(method._advisor) {
			method = method._advisor.orig;
		}

		names = parseParams(method);
		mapName = options.mapName || defaultNameMapper;
		handleMissing = options.fail ? failIfMissing : noop;

		injectedArgs = collectArgs(target, names, mapName, resolveRef, handleMissing);

		if(injectedArgs.length) {
			promise = when.all(injectedArgs).then(function(injectedArgs) {
				injectedArgs = injectedArgs.filter(function(a) { return !!a; });
				addParamInjectionAdvice(target, methodName, injectedArgs);
			});
		}

		return promise;
	}

	function collectArgs(target, names, mapName, resolveRef, handleMissing) {
		return names.reduce(function (filtered, name, i) {
			var mapped, arg;

			mapped = mapName(target, name);
			if (mapped) {
				arg = { index: i };
				filtered.push(resolveRef(mapped).then(function (val) {
					arg.value = val;
					return arg;
				}).otherwise(handleMissing));
			}
			return filtered;
		}, []);
	}

	function addParamInjectionAdvice(target, methodName, injectedArgs) {
		meld.around(target, methodName, function (joinpoint) {
			var args = joinpoint.args.slice();

			injectedArgs.forEach(function (arg) {
				if (arg.index in args) {
					args.splice(arg.index, 0, arg.value);
				} else {
					args[arg.index] = arg.value;
				}
			});

			return joinpoint.proceedApply(args);
		});
	}

	function parseParams(f) {
		var args = paramsRx.exec(String(f));
		if (args[1]) {
			return args[1].split(splitRx);
		}
		return [];
	}

	/**
	 * Returns true if it is a Node
	 * Adapted from: http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
	 * @param it anything
	 * @return true iff it is a Node
	 */
	function isNode(it) {
		return typeof Node === "object"
			? it instanceof Node
			: it && typeof it === "object" && typeof it.nodeType === "number" && typeof it.nodeName==="string";
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
