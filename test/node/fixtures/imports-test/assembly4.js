(function(define){define(function(require){
return {
	$imports: ['./module1', './module4'],
};
});})(typeof define !== 'undefined' ? define : function(fac){module.exports = fac(require);});
