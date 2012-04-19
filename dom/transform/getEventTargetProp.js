(function (define) {
define(function () {

	return function (property) {
		if (!property) property = 'value';

		return function getEventTargetProp (e) {
			var target = e.selectorTarget || e.target || e.srcElement;
			return target && target[property];
		};

	};

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));