/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: aop.js
*/
define(['require'], function(require) {

	var ap, obj, tos;
	
	ap = Array.prototype;
	obj = {};
	tos = Object.prototype.toString;

	function isArray(it) {
		return tos.call(it) == '[object Array]';
	}

	function argsToArray(a) {
		return ap.slice.call(a);
	}

	//
	// Decoration
	//

	function applyDecorator(target, Decorator, args) {
		args = args ? [target].concat(args) : [target];

		Decorator.apply(null, args);
	}
	
	function doDecorate(target, decorator, args, wire) {
		var d = wire.deferred();

		require([decorator], function(Decorator) {

			if(args) {
				wire(args).then(function(resolvedArgs) {
					applyDecorator(target, Decorator, resolvedArgs);
					d.resolve();
				});

			} else {
				applyDecorator(target, Decorator);
				d.resolve();

			}
		});
		
		return d;		
	}

	function decorateAspect(decorators, promise, facet, wire) {
		var target, options, promises;

		target = facet.target;
		options = facet.options;
		promises = [];

		for(var d in options) {
			promises.push(doDecorate(target, decorators[d]||d, options[d], wire));
		}

		wire.whenAll(promises).then(function() {
			promise.resolve();
		});

	}

	//
	// Introductions
	//
	
	function introduce(target, src) {
		var name, s;

		for(name in src) {
			s = src[name];
			if(!(name in target) || (target[name] !== s && (!(name in obj) || obj[name] !== s))) {
				target[name] = s;
			}
		}
	}

	function doIntroduction(target, introduction, wire) {
		var d = wire.deferred();

		require([introduction], function(resolved) {
			introduce(target, resolved);
			d.resolve();
		});

		return d;
	}
	
	function introduceAspect(introductions, promise, facet, wire) {
		var target, intros, intro, i, promises;
		
		target = facet.target;
		intros = facet.options;
		
		if(!isArray(intros)) intros = [intros];
		i = intros.length;

		promises = [];

		while((intro = intros[--i])) {
			promises.push(doIntroduction(target, introductions[intro]||intro, wire));
		}

		wire.whenAll(promises).then(function() {
			promise.resolve();
		});
	}

	//
	// Advice
	//

	function adviceAspect(promise, facet, wire) {
		promise.resolve();
	}

	function callAdvice(advices, target, arguments) {
		var i, advice;

		i = advices.length;

		while((advice = advices[--i])) {
			advice.apply(target, arguments);
		}
	}

	function makeAdviceList(advices, order) {
		return function(advice) {
			order.call(advices, advice);
		};
	}

	function addAdvice(type, target, func, adviceFunc) {
		var advised = target[func];
		
		if(!advised._advisor) {
			var args, before, after, around, advisor, interceptor;

			args = argsToArray(arguments);
			before = [];
			after  = [];
			afterReturning  = [];
			afterThrowing   = [];
			around = {};

			// Intercept calls to the original function, and invoke
			// all currently registered before, around, and after advices
			interceptor = target[func] = function() {
				var targetArgs, result, afterType;

				targetArgs = argsToArray(arguments);
				afterType = afterReturning;

				// Befores
				callAdvice(before, this, targetArgs);
				
				// Call around if registered.  If not call original
				try {
					result = (around.advice||advised).apply(this, targetArgs);

				} catch(e) {
					result = e;
					afterType = afterThrowing;

				}

				callAdvice(afterType, this, [result]);					

				// TODO: Is it correct to pass original arguments here or
				// return result?  What if exception occurred?  Should result
				// then be the exception?
				callAdvice(after, this, targetArgs);

				return result;
			};

			interceptor._advisor = {
				before: makeAdviceList(before, ap.unshift),
				after:  makeAdviceList(after, ap.push),
				afterReturning: makeAdviceList(afterReturning, ap.push),
				afterThrowing:  makeAdviceList(afterThrowing, ap.push),
				around: function(f) {
					around.advice = function() {
						var args, self;
						args = argsToArray(arguments);
						self = this;

						function proceed() {
							return advised.apply(self, args);
						}

						f.call(self, { args: args, target: self, proceed: proceed });
					};
				}
			};
		}

		advised._advisor[type](adviceFunc);

		return advised._advisor;
	}

	return {
		/*
			Function: wire$plugin
			Invoked when wiring starts and provides two promises: one for wiring the context,
			and one for destroying the context.  Plugins should register resolve, reject, and
			promise handlers as necessary to do their work.
			
			Parameters:
				ready - promise that will be resolved when the context has been wired, rejected
					if there is an error during the wiring process, and will receive progress
					events for object creation, property setting, and initialization.
				destroy - promise that will be resolved when the context has been destroyed,
					rejected if there is an error while destroying the context, and will
					receive progress events for objects being destroyed.
		*/
		wire$plugin: function(ready, destroyed, options) {
			var decorators, introductions;
			
			decorators = options.decorators||{};
			introductions = options.introductions||{};

			return {
				facets: {
					advice: {
						configure: adviceAspect
					},
					decorate: {
						configure: function(promise, facet, wire) {
							decorateAspect(decorators, promise, facet, wire);
						}
					},
					introduce: {
						configure: function(promise, facet, wire) {
							introduceAspect(introductions, promise, facet, wire);
						}
					}
				}
			};
		}
	};
});