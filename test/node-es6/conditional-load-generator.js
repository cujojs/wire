
var templ = '(function(define){\n'+
'\n'+
'	function evaluates (statement) {\n'+
'		try {\n'+
'			eval(statement);\n'+
'			return true;\n'+
'		} catch (err) {\n'+
'			return false;\n'+
'		}\n'+
'	}\n'+
'\n'+
'	function isClassAvailable() {\n'+
'		return evaluates(\'class es6TestClass_ibyechBaloodren7 {}\');\n'+
'	}\n'+
'\n'+
'	function isSpreadAvailable() {\n'+
'		return evaluates(\'parseInt(...[\"20\", 10])\');\n'+
'	}\n'+
'\n'+
'	var tests = TEST_FILES;\n'+
'	var requires = [];\n'+
'\n'+
'	if(\n'+
'		isClassAvailable()\n'+
'		&& isSpreadAvailable()\n'+
'		&& !(typeof(process) !== \'undefined\' && \'ES_VERSION\' in process.env && parseFloat(process.env.ES_VERSION) < 6)\n'+
'	) {\n'+
'		requires = tests;\n'+
'	}\n'+
'	console.log(\'class operator \'+ (isClassAvailable() ? \'\' : \'not \') + \'available in browser\');\n'+
'	console.log(\'spread operator \'+ (isSpreadAvailable() ? \'\' : \'not \') + \'available in browser\');\n'+
'	define(requires, function(){});\n'+
'\n'+
'})(typeof define !== \'undefined\' ? define : function(factory){module.exports = factory(require);});';

module.exports = function (testFiles){
	return templ.replace(/TEST_FILES/, JSON.stringify(testFiles));
};
