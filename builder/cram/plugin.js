/** @license MIT License (c) copyright F. Matrat */

/**
 * TODO Fabrice.
 * https://github.com/cujojs/cram
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
 (function(define) {
define(function(require) {

	var replaceIdsRegex, removeCommentsRx;

	// adapted from cram's scan function:
	//replaceIdsRegex = /(define)\s*\(\s*(?:\s*["']([^"']*)["']\s*,)?(?:\s*\[([^\]]+)\]\s*,)?\s*(function)?\s*(?:\(([^)]*)\))?/g;
	replaceIdsRegex = /(define)\s*\(\s*(?:\s*["']([^"']*)["']\s*,)?(?:\s*\[([^]]*)]\s*,)?/;
	removeCommentsRx = /\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g;
 
	return {
		injectIds: injectIds
	};

	function injectIds (moduleText, absId, moduleIds) {
		// note: replaceIdsRegex removes commas, parens, and brackets
		return moduleText.replace(removeCommentsRx, '').replace(replaceIdsRegex, function (m, def, mid, depIds) {

			// merge deps, but not args since they're not referenced in module
			if (depIds) moduleIds = moduleIds.concat(depIds);

			moduleIds = moduleIds.map(quoted).join(', ');
			if (moduleIds) moduleIds = '[' + moduleIds + '], ';

			return def + '(' + quoted(absId) + ', ' + moduleIds;
		});
	}

	function quoted (id) {
		return '"' + id + '"';
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
