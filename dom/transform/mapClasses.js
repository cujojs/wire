(function (define) {
define(function (require) {
	"use strict";

	var mapTokenList, replaceClasses, functional;

	mapTokenList = require('./mapTokenList');
	replaceClasses = require('./replaceClasses');
	functional = require('../../lib/functional');

	return function(map, node, options) {
		return functional.compose(
			mapTokenList(map, options),
			replaceClasses(node, options)
		);
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));