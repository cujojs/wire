/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire
 * Javascript IOC Container
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @version 0.8.0
 */

(function(global, define){
define(['require', 'when', './lib/context'], function(require, when, createContext) {

	"use strict";

	var rootSpec, rootContext, rootOptions;

	wire.version = "0.8.0";

	rootSpec = global['wire'] || {};
	rootOptions = { require: require };

	//
	// Module API
	//

	/**
	 * The top-level wire function that wires contexts as direct children
	 * of the (possibly implicit) root context.  It ensures that the root
	 * context has been wired before wiring children.
	 *
	 * @public
	 *
	 * @param spec {String|Array|*}
	 */
	function wire(spec, options) {

		// If the root context is not yet wired, wire it first
		if (!rootContext) {
			rootContext = createContext(rootSpec, null, rootOptions);
		}

		// Use the rootContext to wire all new contexts.
		return when(rootContext,
			function (root) {
				return root.wire(spec, options);
			}
		);
	}

	/**
	 * AMD loader plugin API
	 */
	wire.load = amdLoad;

	/**
	 * AMD Builder plugin API
	 */
	// pluginBuilder: './build/amd/builder'
	// cram > v0.2 will support pluginBuilder property
	wire['pluginBuilder'] = './build/amd/builder';

	return wire;

	//noinspection JSUnusedLocalSymbols
	/**
	 * AMD Loader plugin API
	 * @param name {String} spec module id, or comma-separated list of module ids
	 * @param require unused
	 * @param callback {Function|Promise} callback to call or promise to resolve when wiring is completed
	 * @param config unused
	 */
	function amdLoad(name, require, callback, config) {
		var d = when.defer();
		d.then(callback, function(e) {
			throw e;
		});

		// If it's a string, try to split on ',' since it could be a comma-separated
		// list of spec module ids
		when.chain(wire(name.split(','), { require: require }), d);
	}

});
})(this,
	typeof define == 'function'
	// AMD
	? define
	// CommonJS
	: function(deps, factory) {
		module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
			return require(x);
		})));
	}
);