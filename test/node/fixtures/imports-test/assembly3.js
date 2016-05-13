(function(define){define(function(require){
return {
	comp_1_1: 'override imported comp_1_1',

	$imports: './module1',

	comp_1_2: 'override imported comp_1_2',
};
});})(typeof define !== 'undefined' ? define : function(fac){module.exports = fac(require);});
