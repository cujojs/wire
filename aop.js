/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/aop plugin
 * Provides AOP for components created via wire, including Decorators,
 * Introductions (mixins), and Pointcut-based Aspect Weaving.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function(define) { 'use strict';
define(function(require) {

	var meld, when, sequence, connection, adviceTypes, adviceStep, undef;

	meld = require('meld');
	when = require('when');
	sequence = require('when/sequence');
	connection = require('./lib/connection');

	// "after" is not included in these standard advice types because
	// it is created as promise-aware advice.
	adviceTypes = ['before', 'around', 'afterReturning', 'afterThrowing'];
	adviceStep = 'connect:before';

    //
    // Decoration
    //

    function applyDecorator(target, Decorator, args) {
        args = args ? [target].concat(args) : [target];

        Decorator.apply(null, args);
    }

    function makeDecorator(decorator, args, wire) {
		return function(target) {
			function apply(Decorator) {
				return args
					? when(wire(args), function (resolvedArgs) {
					applyDecorator(target, Decorator, resolvedArgs);
				})
					: applyDecorator(target, Decorator);
			}

			return when(wire.resolveRef(decorator), apply);
		};
    }

    function decorateFacet(resolver, facet, wire) {
        var target, options, tasks;

        target = facet.target;
        options = facet.options;
        tasks = [];

        for(var decoratorRefName in options) {
            tasks.push(makeDecorator(decoratorRefName, options[decoratorRefName], wire));
        }

		resolver.resolve(sequence(tasks, target));
    }

	//
	// Simple advice
	//

	function addSingleAdvice(addAdviceFunc, proxy, advice, options, wire) {

		function handleAopConnection(srcProxy, srcMethod, adviceHandler) {
			checkAdvisable(srcProxy.target, srcMethod);
			addAdviceFunc(srcProxy, srcMethod, adviceHandler);
		}

		return connection.parse(proxy, advice, options, wire, handleAopConnection);
	}

	function checkAdvisable(source, method) {
		if (!(typeof method == 'function' || typeof source[method] == 'function')) {
			throw new TypeError('Cannot add advice to non-method: ' + method);
		}
	}

	function makeSingleAdviceAdd(adviceType) {
		return function (srcProxy, sourceMethod, advice) {
			var aspect = {};
			aspect[adviceType] = advice;
			return srcProxy.advise(sourceMethod, aspect);
		};
	}

	function addAfterFulfillingAdvice(srcProxy, sourceMethod, advice) {
		return srcProxy.advise(sourceMethod, {
			afterReturning: function(promise) {
				return when(promise, advice);
			}
		});
	}

	function addAfterRejectingAdvice(srcProxy, sourceMethod, advice) {
		return srcProxy.advise(sourceMethod, {
			afterReturning: function(promise) {
				return when(promise, null, advice);
			}
		});
	}

	function addAfterPromiseAdvice(srcProxy, sourceMethod, advice) {
		return srcProxy.advise(sourceMethod, {
			after: function(promise) {
				return when(promise, advice, advice);
			}
		});
	}

	function makeAdviceFacet(addAdviceFunc) {
		return function(resolver, facet, wire) {
			var advice, target, advicesToAdd, promises;

			target = facet;
			advicesToAdd = facet.options;
			promises = [];

			for(advice in advicesToAdd) {
				promises.push(addSingleAdvice(addAdviceFunc,
					target, advice, advicesToAdd[advice], wire));
			}

			resolver.resolve(when.all(promises));
		};
	}

    //
    // Aspect Weaving
    //

    function applyAspectCombined(targetProxy, aspect, wire) {
        return when(wire.resolveRef(aspect), function (aspect) {
            var pointcut = aspect.pointcut;

            if (pointcut) {
                targetProxy.advise(pointcut, aspect);
            }

            return targetProxy;
        });
    }

    function applyAspectSeparate(targetProxy, aspect, wire) {
        var pointcut, advice;

        pointcut = aspect.pointcut;
        advice = aspect.advice;

        function applyAdvice(pointcut) {
            return when(wire.resolveRef(advice), function (aspect) {
                targetProxy.advise(pointcut, aspect);
                return targetProxy;
            });
        }

        return typeof pointcut === 'string'
            ? when(wire.resolveRef(pointcut, applyAdvice))
            : applyAdvice(pointcut);
    }

    function weave(resolver, proxy, wire, options) {
		// TODO: Refactor weaving to use proxy.invoke

        var target, path, aspects, applyAdvice;

        aspects = options.aspects;
        path = proxy.path;

        if (!aspects || path === undef) {
            resolver.resolve();
            return;
        }

        target = proxy.target;
        applyAdvice = applyAspectCombined;

        // Reduce will preserve order of aspects being applied
        resolver.resolve(when.reduce(aspects, function(proxy, aspect) {
            var aspectPath;

            if (aspect.advice) {
                aspectPath = aspect.advice;
                applyAdvice = applyAspectSeparate;
            } else {
                aspectPath = aspect;
            }

            return typeof aspectPath === 'string' && aspectPath !== path
                ? applyAdvice(proxy, aspect, wire)
                : proxy;

        }, proxy));
    }

	/**
	 * Creates wire/aop plugin instances.
	 *
	 * @param options {Object} options passed to the plugin
	 */
    return function(options) {

		var plugin = {
			facets: {
				decorate:       makeFacet('configure:after', decorateFacet),
				afterFulfilling: makeFacet(adviceStep, makeAdviceFacet(addAfterFulfillingAdvice)),
				afterRejecting:  makeFacet(adviceStep, makeAdviceFacet(addAfterRejectingAdvice)),
				after: makeFacet(adviceStep, makeAdviceFacet(addAfterPromiseAdvice))
			}
		};

		if(options.aspects) {
			plugin.create = function(resolver, proxy, wire) {
				weave(resolver, proxy, wire, options);
			};
		}

		// Add all regular single advice facets
		adviceTypes.forEach(function(adviceType) {
			plugin.facets[adviceType] = makeFacet(adviceStep,
				makeAdviceFacet(makeSingleAdviceAdd(adviceType)));
		});

		return plugin;

		function makeFacet(step, callback) {
			var facet = {};

			facet[step] = function(resolver, proxy, wire) {
				callback(resolver, proxy, wire);
			};

			return facet;
		}

	};
});
}(typeof define == 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
