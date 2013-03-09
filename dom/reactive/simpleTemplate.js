(function (define) {
define(function () {

	var parseTemplateRx;

	parseTemplateRx = /\$\{([^}]*)\}|\{\{([^}]*)\}\}/g;

	return {
		parse: parse,
		compile: compile,
		stringify: stringify,
		exec: exec,
		tokenizers: {
			dollarBrace: dollarizer,
			doubleBrace: bracerizer
		}
	};

	/**
	 * Converts a compiled template (array of template parts) back into a string
	 * template.
	 * @param {Array} compiled is the collection of template sections.  Each
	 *   element in the array is either { literal: "a string" } or
	 *   { token: "key" }.
	 * @param {Function} [tokenize] converts a token key to a token. e.g.
	 *   "foo.bar" --> "${foo.bar}" or "anything" --> "{{anything}}".
	 *   If missing, a tokenize that converts to ${token} will be used.
	 *   function (token) { return string; }
	 * @return {String}
	 */
	function stringify (compiled, tokenize) {
		if (!tokenize) tokenize = dollarizer;
		return exec(compiled, tokenize);
	}

	/**
	 * Executes a compiled template, using a stringify function to convert
	 * tokens to strings to be inserted into the output.  The token-to-string
	 * conversions are not cached, so each time a token is encountered, the
	 * stringify function is called.  (The stringify function could cache.)
	 * @param {Array} compiled is the collection of template sections.  Each
	 *   element in thie array is either { literal: "a string" } or
	 *   { token: "key" }.
	 * @param {Function} stringify converts a token to a string.
	 *   function (token) { return string; }
	 * @return {String}
	 */
	function exec (compiled, stringify) {
		return compiled.map(function (part) {
			return part.literal
				? part.literal
				: stringify(part.token);
		}).join('');
	}

	/**
	 * Scans a template and calls back the onText and onToken functions with
	 * each token and each text segment between tokens.
	 * @param {String} template
	 * @param {Function} onText function (text) {}
	 * @param {Function} onToken function (key, token) {}
	 * @return {String} template
	 */
	function parse (template, onText, onToken) {
		var end;

		end = 0;

		template.replace(parseTemplateRx, function (m, dToken, mToken, pos) {
			var token;

			token = dToken || mToken;

			// capture any characters before token
			if (pos > end) {
				onText(template.slice(end, pos));
			}

			if (!token) throw new Error('blank token found in ' + template);

			// capture token
			onToken(token, dToken ? dollarizer(token) : bracerizer(token));

			end = pos + m.length;
		});

		if (end < template.length) {
			onText(template.slice(end));
		}

		return template;
	}

	/**
	 * Returns a compiled template which is an array of objects with either a
	 * "token" property or a "string" property.
	 * @param {String} template has tokens wrapped in either ${} or {{}}. e.g.
	 *   ${i.am.a.token} or {{yet-another-token}}.  Tokens cannot have braces
	 *   or semicolons in them.
	 * @return {Array}
	 */
	function compile (template) {
		var parts;

		parts = [];

		parse(template, captureText, captureToken);

		return parts;

		function captureText (text) {
			parts.push({ literal: text });
		}

		function captureToken (key, token) {
			parts.push({ key: key, token: token });
		}
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