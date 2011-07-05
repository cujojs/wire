/**
 * @license Copyright (c) 2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

// TODO:
// 1. Strategy for removing advice
// 2. Provide access to advisor
(function(define) {
define([], function() {
	
	var VERSION, ap, prepend, append, slice, isArray, undef;

	VERSION = "0.2.0";
	
	ap      = Array.prototype;
	prepend = ap.unshift;
	append  = ap.push;
	slice   = ap.slice;
	
	isArray = Array.isArray || function isArrayShim(it) {
		return Object.prototype.toString.call(it) == '[object Array]';
	};

	// Helper to convert arguments to an array
	function argsToArray(a) {
		return slice.call(a);
	}

	// Invoke all advice functions in the supplied context, with the
	// supplied args.
	function callAdvice(advices, context, args) {
		var i, advice;

		i = 0;
		
		while((advice = advices[i++])) {
			advice.apply(context, args);
		}
	}

	// Creates a function to add a new advice function in the correct
	// order (prepend or append).
	function makeAdviceAdd(advices, order) {
		return function(adviceFunc) {
			if(isArray(adviceFunc)) {
				for (var i = 0, len = adviceFunc.length; i < len; i++) {
					order.call(advices, adviceFunc[i]);
				}
			} else {
				order.call(advices, adviceFunc);
			}
		};
	}
	
	// Returns the advisor for the target object-function pair.  A new advisor
	// will be created if one does not already exist.
	function getAdvisor(target, func) {
		var advised = target[func];

		if(typeof advised !== 'function') throw new Error('Advice can only be applied to functions: ' + func);
		
		if(!advised._advisor) {
			var orig, before, around, afterReturning, afterThrowing, after;

			// Save the original, not-yet-advised function
			orig = advised;
			
			// Advices.  They'll be invoked in this order.
			before = [];
			around = {};
			afterReturning = [];
			afterThrowing  = [];
			after = [];

			// Intercept calls to the original function, and invoke
			// all currently registered before, around, and after advices
			advised = target[func] = function() {
				var targetArgs, result, afterType;

				targetArgs = argsToArray(arguments);
				afterType = afterReturning;

				// Befores
				callAdvice(before, this, targetArgs);
				
				try {
					// Call around if registered.  If not, call original
					result = (around.advice||orig).apply(this, targetArgs);
					
				} catch(e) {
					// If an exception was thrown, save it as the result,
					// and switch to afterThrowing
					result = e;
					afterType = afterThrowing;

				}

				// Set args for after* advice types
				targetArgs = [result];

				// Call the appropriate afterReturning/Throwing advice type based
				// on the outcome of calling the original func or around advice
				callAdvice(afterType, this, targetArgs);					

				// Always call "after", regardless of success return or exception.
				callAdvice(after, this, targetArgs);

				// If the original (or around) threw an exception, rethrow
				// Otherwise, return the result
				if(afterType === afterThrowing) {
					throw result;
				}
				
				return result;
			};

			advised._advisor = {
				before:         makeAdviceAdd(before, prepend),
				afterReturning: makeAdviceAdd(afterReturning, append),
				afterThrowing:  makeAdviceAdd(afterThrowing, append),
				after:          makeAdviceAdd(after, append),
				around: function(adviceFunc) {
					// Allow around "stacking" by wrapping existing around,
					// if it exists.  If not, wrap orig method.
					var aroundee = around.advice || orig;

					around.advice = function() {
						var args, self, proceed, joinpoint;
						
						// Proceed to next around or original
						proceed = function(modifiedArgs) {
							return aroundee.apply(self, modifiedArgs || args);
						};

						// Joinpoint representing the original method call
						joinpoint = {
							// Original arguments
							args:   (args = argsToArray(arguments)),
							// Target object on which the method was called
							target: (self = this),
							// The name of the method that was called
							method: func,
							// Proceed function.  Advice function should call this to trigger
							// the next around or the original method invocation
							proceed: function(modifiedArgs) {
								// Call next around or original and get result
								var result = proceed(modifiedArgs);

								// Overwrite proceed to ensure the original can only be called once
								proceed = function() { throw new Error("proceed() already called"); };

								return result;
							}
						};

						// Call outermost around advice to start the chain
						return adviceFunc.call(self, joinpoint);
					};
				}
			};			
		}
		
		return advised._advisor;
	}

	// Add a single advice, creating a new advisor for the target func, if necessary.
	function addAdvice(target, func, type, adviceFunc) {
		var advisor = getAdvisor(findTarget(target), func);

		advisor[type](adviceFunc);

		return advisor;
	}
	
	// Add several advice types to func
	function addToFunc(object, func, advices) {
		// advices is an object, and should have keys for advice types,
		// whose values are the advice functions.

		// First, get the advisor for this object/func pair
		var advisor, addAdvice;
		
		advisor = getAdvisor(object, func);

		// Register all advices with the advisor
		for (var a in advices) {
			addAdvice = advisor[a];
			if (addAdvice) {
				addAdvice(advices[a]);
			}
		}
	}

	function addToArray(object, funcArray, advices) {
		var f, i = 0;
		while((f = funcArray[i++])) {
			addToFunc(object, f, advices);
		}
	}

	function addAspect(target, pointcut, advices) {
		// pointcut can be: string, Array of strings, RegExp, Function
		var pointcutType;

        target = findTarget(target);

		if(isArray(pointcut)) {
			addToArray(target, pointcut, advices);

		} else {
			pointcutType = typeof pointcut;

			if(pointcutType === 'string') {
				if(typeof target[pointcut] === 'function') {
					addToFunc(target, pointcut, advices);
				}

			} else if(pointcutType === 'function') {
				addToArray(target, pointcut(target), advices);

			} else {
				// Assume the pointcut is a RegExp
				for(var p in target) {
					// TODO: Decide whether hasOwnProperty is correct here
					// Only apply to own properties that are functions, and match the pointcut regexp
					if(typeof target[p] === 'function' && pointcut.test(p)) {
					// if(object.hasOwnProperty(p) && typeof object[p] === 'function' && pointcut.test(p)) {
						addToFunc(target, p, advices);

					}
				}

			}
		}
	}

    function findTarget(target) {
        return target.prototype || target;
    }

	// Create an API function for the specified advice type
	function adviceApi(type) {
		return function(target, func, adviceFunc) {
			return addAdvice(target, func, type, adviceFunc);
		};
	}

	// Public API
	return {
		// General add aspect
		add:            addAspect,

		// Add a single, specific type of advice
		before:         adviceApi('before'),
		around:         adviceApi('around'),
		afterReturning: adviceApi('afterReturning'),
		afterThrowing:  adviceApi('afterThrowing'),
		after:          adviceApi('after'),

		// Version
		version:        VERSION
	};

});
})(typeof define != 'undefined' ? define : function(deps, factory) {
    // global aop, if not loaded via require
    this.aop = factory();
});