(function(define){

	function evaluates (statement) {
		try {
			eval(statement);
			return true;
		} catch (err) {
			return false;
		}
	}

	function isClassAvailable() {
		return evaluates('class es6TestClass_ibyechBaloodren7 {}');
	}

	function isSpreadAvailable() {
		return evaluates('parseInt(...["20", 10])');
	}

	var tests = [];
	var requires = [];

	if(
		isClassAvailable()
		&& isSpreadAvailable()
		&& !(typeof(process) !== 'undefined' && 'ES_VERSION' in process.env && parseFloat(process.env.ES_VERSION) < 6)
	) {
		requires = tests;
	}
	console.log('class operator '+ (isClassAvailable() ? '' : 'not ') + 'available in browser');
	console.log('spread operator '+ (isSpreadAvailable() ? '' : 'not ') + 'available in browser');
	define(requires, function(){});

})(typeof define !== 'undefined' ? define : function(factory){module.exports = factory(require);});