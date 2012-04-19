(function (define) {
define(function () {
"use strict";

	return function (map, options) {
		var parser, delimiter;

		if (!options) options = {};

		parser = options.parser || /(^|\s+)([^\s]+)/g;
		delimiter = options.delimiter || ' ';

		return function translateTokenLists (tokenList) {
			if (!tokenList) tokenList = '';
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