/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: domReady.js
	A base wire/domReady module that plugins can use if they need domReady.  Simply
	add 'wire/domReady' to your plugin module dependencies
	(e.g. require(['wire/domReady', ...], function(domReady, ...) { ... })) and you're
	set.

	Returns a function that accepts a callback to be called when the DOM is ready.

	You can also use your AMD loader's paths config to map wire/domReady to whatever
	domReady function you might want to use.  See documentation for your AMD loader
	for specific instructions.  For curl.js and requirejs, it will be something like:

	paths: {
		'wire/domReady': 'path/to/my/domReady'
	}
*/
(function(global) {
define(['require'], function(req) {

	var ready;

	// Try require.ready first
	ready = (global.require && global.require.ready) || function (cb) {
		// If it's not available, assume curl's domReady module
		req(['curl/domReady'], function (domReady) {
			// Once we have it, we can replace ready with the
			// domReady module directly.
			ready = domReady;

			// Call the callback
			domReady(cb);
		});
	};

	// Return a wrapper so that ready can be replaced if we're using
	// curl's domReady
	return function (cb) {
		ready(cb);
	};
});
})(this);
