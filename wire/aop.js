/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: aop.js
*/
define(['require', 'aop', 'when'], function(require, aop, when) {

	var ap, obj, tos, isArray, whenAll, deferred, undef;
	
	ap = Array.prototype;
	obj = {};
	tos = Object.prototype.toString;

	isArray = Array.isArray || function(it) {
		return tos.call(it) == '[object Array]';
	};

    whenAll = when.all;
    deferred = when.defer;

    //
	// Decoration
	//

	function applyDecorator(target, Decorator, args) {
		args = args ? [target].concat(args) : [target];

		Decorator.apply(null, args);
	}
	
	function doDecorate(target, decorator, args, wire) {
		var d = deferred();

		function apply(Decorator) {
			if(args) {
				wire(args).then(function(resolvedArgs) {
					applyDecorator(target, Decorator, resolvedArgs);
					d.resolve();
				});

			} else {
				applyDecorator(target, Decorator);
				d.resolve();

			}
		}

		wire.resolveRef(decorator).then(apply);

		return d;		
	}

	function decorateFacet(promise, facet, wire) {
		var target, options, promises;

		target = facet.target;
		options = facet.options;
		promises = [];

		for(var d in options) {
			promises.push(doDecorate(target, d, options[d], wire));
		}

		whenAll(promises).then(
			function() {
				promise.resolve();
			},
			function() {
				promise.reject();
			}
		);

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
		var d = deferred();

		wire.resolveRef(introduction).then(function(resolved) {
			introduce(target, resolved);
			d.resolve();
		});

		return d;
	}

	function introduceFacet(promise, facet, wire) {
		var target, intros, intro, i, promises;
		
		target = facet.target;
		intros = facet.options;
		
		if(!isArray(intros)) intros = [intros];
		i = intros.length;

		promises = [];

		while((intro = intros[--i])) {
			promises.push(doIntroduction(target, intro, wire));
		}

		whenAll(promises).then(
			function() {
				promise.resolve();
			},
			function() {
				promise.reject();
			}
		);
	}

	//
	// Aspects
	//

//	function adviseFacet(aspects, promise, facet, wire) {
//		promise.resolve();
//	}

    function applyAspectCombined(promise, target, aspect, wire, add) {
        wire.resolveRef(aspect).then(function (aspect) {
            var pointcut = aspect.pointcut;

            if (pointcut) {
                add(target, pointcut, aspect);
            }
            promise.resolve();
        });
    }

    function applyAspectSeparate(promise, target, aspect, wire, add) {
        var pointcut, advice;

        pointcut = aspect.pointcut;
        advice = aspect.advice;

        function applyAdvice(pointcut) {
            wire.resolveRef(advice).then(function (aspect) {
                add(target, pointcut, aspect);
                promise.resolve();
            });
        }

        if (typeof pointcut === 'string') {
            wire.resolveRef(pointcut).then(applyAdvice);
        } else {
            applyAdvice(pointcut);
        }
    }

    function weave(resolver, proxy, wire, options, add) {

        function fail(e) { resolver.reject(e); }

        var target, path, aspects, aspect, aspectPath, promises, d, applyAdvice, i;

        aspects = options.aspects;
        path = proxy.path;

        if (!aspects || path === undef) {
            resolver.resolve();
            return;
        }

        target = proxy.target;
        applyAdvice = applyAspectCombined;
        promises = [];

        try {
            i = 0;
            while ((aspectPath = aspect = aspects[i++])) {

                if (aspect.advice) {
                    aspectPath = aspect.advice;
                    applyAdvice = applyAspectSeparate;
                }

                if (typeof aspectPath === 'string' && aspectPath !== path) {
                    d = deferred();
                    promises.push(d);
                    applyAdvice(d, target, aspect, wire, add);
                }
            }

            whenAll(promises, resolver.resolve, fail);

        } catch (e) {
            fail(e);
        }
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

            // Track aspects so they can be removed when the context is destroyed
            var woven = [];

            // Remove all aspects that we added in this context
            when(destroyed, function() {
                for(var i = woven.length; i >= 0; --i) {
                    woven[i].remove();
                } 
            });

            /**
             * Function to add an aspect and remember it in the current context
             * so that it can be removed when the context is destroyed.
             * @param target
             * @param pointcut
             * @param aspect
             */
            function add(target, pointcut, aspect) {
                woven.push(aop.add(target, pointcut, aspect))
            }

			function makeFacet(step, callback) {
				var facet = {};
				
				facet[step] = function(resolver, proxy, wire) {
					callback(resolver, proxy, wire);
				};

				return facet;
			}

			// Plugin
			return {
				facets: {
					decorate:  makeFacet('configure', decorateFacet),
					introduce: makeFacet('configure', introduceFacet)
				},
				create: function(resolver, proxy, wire) {
					weave(resolver, proxy, wire, options, add);
				}
			};
		}
	};
});