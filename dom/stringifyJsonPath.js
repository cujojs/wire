(function (define) {
define(function () {

	var splitJsonPathRx;

	splitJsonPathRx = /(?:["']?\])?(?:\.|\[["']?|$)/;

	function stringifyJsonPath (obj, propPath) {
		var props, prop;
		props = propPath.split(splitJsonPathRx);
		while (obj && (prop = props.shift())) {
			obj = obj[prop];
		}
		return obj;
	}

	return stringifyJsonPath;

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));