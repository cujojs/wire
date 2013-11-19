(function(define) {
define(function() {

	return function(methodName, args) {
		return function(target) {
			console.log(methodName, target, target[methodName]);
			return target[methodName].apply(target, args);
		};
	};

});
})(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); });