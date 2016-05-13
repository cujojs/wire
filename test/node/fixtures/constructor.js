(function(define){define(function(require){
function Constructor(val) {
	this.value = val;
}

Constructor.prototype = {
	setValue: function(value) {
		this.value = value;
	}
};

return Constructor;
});})(typeof define !== 'undefined' ? define : function(fac){module.exports = fac(require);});
