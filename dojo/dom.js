/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dojo/dom plugin
 * Plugin that adds dom query resolver that uses dojo.query
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['../plugin-base/dom', 'dojo/query'], function(createDomPlugin, dojo) {

	return createDomPlugin({
		query: dojo.query,
		addClass: dojo.addClass,
		removeClass: dojo.removeClass
	});

});