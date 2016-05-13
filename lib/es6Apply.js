/* jshint esversion: 6 */
(function(define) {
'use strict';
define(function() {
	return function(func, thisObj, args) {
		var result = null;

		if(thisObj === func || (thisObj && thisObj.constructor === func)) {
			/* jshint newcap: false */
			result = new func(...(args||[]));

			// detect broken old prototypes with missing constructor
			if (result.constructor !== func) {
				Object.defineProperty(result, 'constructor', {
					enumerable: false,
					value: func
				});
			}
		} else if(thisObj && typeof thisObj[func] === 'function') {
			result = thisObj[func](...args);
		} else {
			result = func.apply(thisObj, args);
		}

		return result;
	};
});
})(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); });
