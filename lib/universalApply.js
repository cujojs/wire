(function(){
	'use strict';

	(function(define){

		function evaluates (statement) {
			try {
				/* jshint evil: true */
				eval(statement);
				/* jshint evil: false */
				return true;
			} catch (err) {
				return false;
			}
		}

		// we have to know it synchronously, we are unable to load this module in asynchronous way
		// we cannot defer `define` and we cannot load module, that would not compile in browser
		// so we can't delegate this check to another module
		function isSpreadAvailable() {
			return evaluates('Math.max(...[ 5, 10 ])');
		}

		var requires = [];
		if (typeof(process) !== 'undefined' && 'ES_VERSION' in process.env) {
			requires.push('./es'+process.env.ES_VERSION+'Apply');
		} else {
			if(isSpreadAvailable()) {
				requires.push('./es6Apply');
			} else {
				requires.push('./es5Apply');
			}
		}

		define(requires, function(apply){
			return apply;
		});
	})(
		typeof define === 'function'
			? define
			: function(requires, factory) {
				module.exports = factory.apply(null, requires.map(require));
			}
	);
})();
