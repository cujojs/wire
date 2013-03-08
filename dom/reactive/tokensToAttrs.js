/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom/reactive/tokensToAttrs
 * converts ${} or {{}} tokens to html tags with data-wire-reactpoint attrs
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function (define) {
define(function (require) {

	var templates,
		htmlIdentifierRx, tokenRx, tagInRx, tagOutRx, attrInRx, attrOutRx,
		parseReactiveHtmlRx;

	templates = require('./template');

	htmlIdentifierRx = '[_$a-zA-Z][_$a-zA-Z0-9]*';
	tokenRx = '\\$\\{([^}]*)\\}|\\{\\{([^}]*)\\}\\}';
	tagInRx = '<(' + htmlIdentifierRx + ')\\s*';
	tagOutRx = '(>)';
	// attributes can have some additional chars, but this pretty close:
	attrInRx = '(' + htmlIdentifierRx + ')\\s*=\\s*["\']?';
	attrOutRx = '(["\'])';

	parseReactiveHtmlRx = new RegExp(
		[tagInRx, attrInRx, tokenRx, attrOutRx, tagOutRx].join('|'),
		'g'
	);

	return function (template) {
		var inTag, inAttr, end, hasReactiveAttr, reactiveAttrs;

		template = String(template);
		end = 0;

		return template.replace(parseReactiveHtmlRx, function (m, tagIn, attrIn, tokenD, tokenM, attrOut, tagOut, pos) {
			var token, out;

			if ('' === tokenD || '' === tokenM) blankErr();

			token = tokenD || tokenM;

			if (inAttr) {
				if (attrOut) {
					// grab any trailing attribute characters
					if (hasReactiveAttr && pos > end) {
						reactiveAttrs[inAttr].push(template.slice(end, pos));
					}
					inAttr = false;
				}
				else if (token) {
					// save attribute token
					if (!(inAttr in reactiveAttrs)) reactiveAttrs[inAttr] = [];
					hasReactiveAttr = true;
					// grab any leading attribute characters
					if (pos > end) {
						reactiveAttrs[inAttr].push(template.slice(end, pos));
					}
					reactiveAttrs[inAttr].push(
						tokenD ? dollarBraceToken(token) : doubleBraceToken(token)
					);
					out = '';
				}
			}
			else if (inTag) {
				if (tagOut) {
					inTag = false;
					if (hasReactiveAttr) {
						out = reactiveAttrsOutput(reactiveAttrs) + tagOut;
					}
				}
				else if (attrIn) inAttr = attrIn;
				else if (token) {
					// this is an empty attribute
					if (!('' in reactiveAttrs)) reactiveAttrs[''] = [];
					reactiveAttrs[''].push(
						tokenD ? dollarBraceToken(token) : doubleBraceToken(token)
					);
					out = '';
				}
			}
			else {
				if (tagIn) {
					inTag = tagIn;
					reactiveAttrs = {};
					hasReactiveAttr = false;
				}
				else if (token) {
					// this is a text/html placeholder
					out = reactiveTextNodeOutput(tokenD ? dollarBraceToken(token) : doubleBraceToken(token));
				}
			}

			end = pos + m.length;

			return out != null ? out : m;
		});

	};

	function blankErr () {
		throw new Error('blank token not allowed in template.');
	}

	function reactiveAttrsOutput (attrs) {
		// collect attrs into a descriptor string
		// data-wire-reactpoint="attr1:template1;attr2:template2"
		return ' data-wire-reactpoint="' + Object.keys(attrs).map(function (attr) {
			var template;
			template = attrs[attr].join('');
			// empty tokens have a special attribute
			return (attr || '(empty)') + ':' + template;
		}).join(';') + '"';
	}

	function reactiveTextNodeOutput (token) {
		var parts;
		parts = token.split(':', 2);
		if (parts.length == 1) parts.unshift('text');
		return '<span data-wire-reactpoint="' + parts.join(':') + '"></span>';
	}

	function dollarBraceToken (token) {
		return '${' + token + '}';
	}

	function doubleBraceToken (token) {
		return '{{' + token + '}}';
	}
});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));