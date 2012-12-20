/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define){ 'use strict';
define(function(require) {

	var when, object;

	when = require('when');
	object = require('./object');

	function Resolver(config) {
		this._resolvers = config.plugins.resolvers;
		this._pluginApi = config.pluginApi;
	}

	Resolver.prototype = {

		isRef: function(it) {
			return it && object.hasOwn(it, '$ref');
		},

		parse: function(it) {
			return this.create(it.$ref, it);
		},

		create: function(name, options) {
			var self, split, resolver;

			self = this;

			split = name.indexOf('!');
			resolver = name.substring(0, split);
			name = name.substring(split + 1);

			return {
				resolver: resolver,
				name: name,
				options: options,
				resolve: function() {
					return self._resolve(resolver, name, options);
				}
			};
		},

		_resolve: function(resolverName, name, options) {
			var deferred, resolver;

			deferred = when.defer();

			if (resolverName) {
				resolver = this._resolvers[resolverName];

				if (resolver) {
					resolver(deferred.resolver, name, options||{}, this._pluginApi);
				} else {
					deferred.reject(new Error('No resolver plugin found: ' + resolverName));
				}

			} else {
				deferred.reject(new Error('Cannot resolve ref: ' + name));
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
	: function(factory) { module.exports = factory(require); }
);