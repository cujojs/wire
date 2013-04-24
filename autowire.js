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

	function defaultAllow() {
		return true;
	}

	function failIfMissing(e) {
		throw e;
	}

	function noop() {}

	function autowireProperties(resolveRef, options, proxy) {
		var target, promises, prop, allow, handleMissing;

		target = proxy.target;
		promises = [];
		allow = options.filter || defaultAllow;
		handleMissing = options.fail ? failIfMissing : noop;

		for(prop in target) {
			if(allow(target, proxy.get(prop))) {
				promises.push(when.join(prop, resolveRef(prop))
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
		var target, promises, prop, allow;

		target = proxy.target;
		promises = [];
		allow = options.filter || defaultAllow;

		function allowMethod(target, prop) {
			return typeof proxy.get(prop) === 'function' && allow(target, prop);
		}
		for(prop in target) {
			if(allowMethod(target, prop)) {
				promises.push(autowireMethodParams(resolveRef, options, proxy, prop));
			}
		}

		return when.all(promises);
	}

	function autowireMethodParams(resolveRef, options, proxy, method) {
		var target, promise, names, injectedArgs, allow, handleMissing;

		target = proxy.target;
		names = parseParams(proxy.get(method));
		injectedArgs = [];
		allow = options.filterParams || defaultAllow;
		handleMissing = options.fail ? failIfMissing : noop;

		names = names.filter(allow.bind(null, target));
		if(names.length) {
			names = names.map(function(name, i) {
				return resolveRef(name).then(function(val) {
					injectedArgs.push({ index: i, value: val });
				}).otherwise(handleMissing);
			});

			promise = when.all(names).then(function() {
				meld.around(target, method, function(joinpoint) {
					var args = joinpoint.args.slice();

					injectedArgs.forEach(function(arg) {
						args.splice(arg.index, 0, arg.value);
					});

					return joinpoint.proceedApply(args);
				});
			});
		}

		return promise;
	}

	function parseParams(f) {
		var args = paramsRx.exec(String(f));
		if (args[1]) {
			return args[1].split(splitRx);
		}
		return [];
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
