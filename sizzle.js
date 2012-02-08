/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/sizzle plugin
 * Adds querySelectorAll functionality to wire using John Resig's Sizzle library.
 * Sizzle must be wrapped in an AMD define().  Kris Zyp has a version of this at
 * http://github.com/kriszyp/sizzle
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author John Hann (@unscriptable)
 */

define(['./plugin-base/dom', 'sizzle'], function(createDomPlugin, sizzle) {

	return createDomPlugin({
		query: sizzle
	});

});
