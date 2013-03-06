(function (define) {
define(function () {

	var parseTemplateRx;

	parseTemplateRx = /\$\{([^}]*)\}|\{\{([^}]*)\}\}/g;

	return {
		parse: parse,
		stringify: stringify,
		exec: exec,
		tokenizers: {
			dollarBrace: dollarizer,
			doubleBrace: bracerizer
		}
	};

	/**
	 * Converts a parsed template (array of template parts) back into a string
	 * template.
	 * @param {Array} parts is the collection of template sections.  Each
	 *   element in the array is either { literal: "a string" } or
	 *   { token: "key" }.
	 * @param {Function} [tokenize] converts a token key to a token. e.g.
	 *   "foo.bar" --> "${foo.bar}" or "anything" --> "{{anything}}".
	 *   If missing, a tokenize that converts to ${token} will be used.
	 *   function (token) { return string; }
	 * @return {String}
	 */
	function stringify (parts, tokenize) {
		if (!tokenize) tokenize = dollarizer;
		return exec(parts, tokenize);
	}

	/**
	 * Executes a parsed template, using a stringify function to convert tokens
	 * to strings to be inserted into the output.  The token-to-string
	 * conversions are not cached, so each time a token is encountered, the
	 * stringify function is called.  (The stringify function could cache.)
	 * @param {Array} parts is the collection of template sections.  Each
	 *   element in thie array is either { literal: "a string" } or
	 *   { token: "key" }.
	 * @param {Function} stringify converts a token to a string.
	 *   function (token) { return string; }
	 * @return {String}
	 */
	function exec (parts, stringify) {
		return parts.map(function (part) {
			return part.literal
				? part.literal
				: stringify(part.token);
		}).join('');
	}

	/**
	 * Returns a parsed template which is an array of objects with either a
	 * "token" property or a "string" property.
	 * @param {String} template has tokens wrapped in either ${} or {{}}. e.g.
	 *   ${i.am.a.token} or {{yet-another-token}}.  Tokens cannot have braces
	 *   or semicolons in them.
	 * @return {Array}
	 */
	function parse (template) {
		var end, parts;

		end = 0;
		parts = [];

		template.replace(parseTemplateRx, function (m, dToken, mToken, pos) {
			var token;

			token = dToken || mToken;

			// capture any characters before token
			if (pos > end) {
				parts.push({ literal: template.slice(end, pos - 1) });
			}

			if (!token) throw new Error('blank token found in ' + template);

			// capture token
			parts.push({ token: token });

			end = pos + m.length;
		});

		if (end < template.length) {
			parts.push({ literal: template.slice(end) });
		}

		return parts;
	}

	function dollarizer (token) {
		return '${' + token + '}';
	}

	function bracerizer (token) {
		return '{{' + token + '}}';
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));