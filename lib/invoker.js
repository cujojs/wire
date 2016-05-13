(function(define) {
define(function(require) {

	var universalApply = require('./universalApply');

	return function(methodName, args) {
		return function(target) {
			return universalApply(target[methodName], target, args);
		};
	};

});
})(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); });
