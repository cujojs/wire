/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom/reactive/tokensToString
 * converts ${} or {{}} tokens to html tags with data-wire-reactpoint attrs
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function (define) {
define(function (require) {

	var parse, undef;

	parse = require('./simpleTemplate').parse;

	/**
	 * Replaces simple tokens in a string.  Tokens are in the format ${key}.
	 * Tokens are replaced by values looked up in an associated hashmap.
	 * If a token's key is not found in the hashmap, an empty string is
	 * inserted instead.
	 * @private
	 * @param {String} template
	 * @param {Object} options
	 * @param {Function} options.stringify callback that stringifies a token.
	 * @param {Function} [options.transform] callback that deals with missing
	 * properties.
	 * @returns {String}
	 */
	function tokensToString (template, options) {
		var stringify, transform, output;

		if (!options.stringify) throw new Error('stringify function must be specified');
		stringify = options.stringify;
		transform = options.transform || blankIfMissing;

		template = String(template);
		output = '';

		parse(
			template,
			function (text) { output += text; },
			function (key) { output += transform(stringify(key)); }
		);

		return output;
	}

	return tokensToString;

	function blankIfMissing (val) {
		return val === undef ? '' : val;
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));