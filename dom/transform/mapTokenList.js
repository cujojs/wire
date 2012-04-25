(function (define) {
define(function () {
"use strict";

	var defaultParser, defaultDelimiter;

	defaultParser = /(^|\s+)([^\s]+)/g;
	defaultDelimiter = ' ';

	return function (map, options) {
		var parser, delimiter;

		if (!options) options = {};

		parser = options.parser || defaultParser;
		delimiter = options.delimiter || defaultDelimiter;

		return function translateTokenLists (tokenList) {
			tokenList = '' + tokenList;
			return tokenList.replace(parser, function (m, s, token) {
				var trans = map[token];
				// if there's a delimiter already (spaces, typically),
				// replace it. if a translated value exists, use it.
				// otherwise, use original token.
				return (s ? delimiter : s) + (trans ? trans : token);
			});
		}

	};

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));