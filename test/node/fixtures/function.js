(function(define){define(function(require){
return function(a, b) {
	return arguments.length > 1 ? a + b : a;
};
});})(typeof define !== 'undefined' ? define : function(fac){module.exports = fac(require);});
