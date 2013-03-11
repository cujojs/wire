(function (define) {
define(function () {

	var splitJsonPathRx, undef;

	splitJsonPathRx = /(?:["']?\])?(?:\.|\[["']?|$)/;

	return jsonPath;

	function jsonPath (obj, propPath, value) {
		var props;
		props = propPath.split(splitJsonPathRx);
		if (null == obj || props.length == 0) return undef;
		if (arguments.length > 2) {
			return setFromPath(obj, props, value);
		}
		else {
			return getFromPath(obj, props);
		}
	}

	function getFromPath (obj, props) {
		do obj = obj[props.shift()]; while (obj && props.length);
		return obj;
	}

	function setFromPath (obj, props, value) {
		var last = props.pop();
		obj = getFromPath(obj, props);
		if (undef != obj) {
			return obj[last] = value;
		}
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));