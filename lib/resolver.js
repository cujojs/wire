/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){
define(['when'], function(when) {

	"use strict";

	function Resolver(config) {
		this._resolvers = config.resolvers;
		this._pluginApi = config.pluginApi;
	}

	Resolver.prototype = {

		isRef: function(it) {
			return it && it.hasOwnProperty('$ref');
		},

		getName: function(refObj) {
			return refObj.$ref;
		},

		resolve: function(refObj) {

			var refName, deferred, split, resolverName, resolver;

			refName = this.getName(refObj);
			deferred = when.defer();
			split = refName.indexOf('!');

			if (split > 0) {
				resolverName = refName.substring(0, split);
				refName = refName.substring(split + 1);

				resolver = this._resolvers[resolverName];

				if (resolver) {
					resolver(deferred.resolver, refName, refObj||{}, this._pluginApi);
				} else {
					deferred.reject("No resolver found for ref: " + refName);
				}

			} else {
				deferred.reject("Cannot resolve ref: " + refName);
			}

			return deferred.promise;

		}
	};

	return Resolver;

});
})(typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(deps, factory) {
		module.exports = factory.apply(this, deps.map(function(x) {
			return require(x);
		}));
	}
);