(function(define) {
'use strict';
define(function() {
	/**
	 * Carefully sets the instance's constructor property to the supplied
	 * constructor, using Object.defineProperty if available.  If it can't
	 * set the constructor in a safe way, it will do nothing.
	 *
	 * @param instance {Object} component instance
	 * @param ctor {Function} constructor
	 */
	function defineConstructorIfPossible(instance, ctor) {
		try {
			Object.defineProperty(instance, 'constructor', {
				value: ctor,
				enumerable: false
			});
		} catch(e) {
			// If we can't define a constructor, oh well.
			// This can happen if in envs where Object.defineProperty is not
			// available, or when using cujojs/poly or other ES5 shims
		}
	}

	return function(func, thisObj, args) {
		var result = null;

		if(thisObj && typeof thisObj[func] === 'function') {
			func = thisObj[func];
		}

		// detect case when apply is called on constructor and fix prototype chain
		if (thisObj === func) {
			thisObj = Object.create(func.prototype);
			defineConstructorIfPossible(thisObj, func);
			func.apply(thisObj, args);
			result = thisObj;
		} else {
			result = func.apply(thisObj, args);
		}

		return result;
	};
});
})(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); });
