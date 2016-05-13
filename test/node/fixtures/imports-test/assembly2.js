(function(define){define(function(require){
return {
	$imports: ['./module1', './module2', './module3']
};
});})(typeof define !== 'undefined' ? define : function(fac){module.exports = fac(require);});
