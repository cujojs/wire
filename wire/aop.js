/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: aop.js
*/
define(['require', 'wire', 'wire/lib/aop'], function(require, globalWire, aop) {

	var ap, obj, tos, isArray;
	
	ap = Array.prototype;
	obj = {};
	tos = Object.prototype.toString;

	isArray = Array.isArray || function(it) {
		return tos.call(it) == '[object Array]';
	};

    //
	// Decoration
	//

	function applyDecorator(target, Decorator, args) {
		args = args ? [target].concat(args) : [target];

		Decorator.apply(null, args);
	}
	
	function doDecorate(target, decorator, args, wire) {
		var d = wire.deferred();

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

		if(typeof decorator == 'string') {
			require([decorator], apply);
		} else {
			apply(decorator);
		}

		return d;		
	}

	function decorateFacet(decorators, promise, facet, wire) {
		var target, options, promises;

		target = facet.target;
		options = facet.options;
		promises = [];

		for(var d in options) {
			promises.push(doDecorate(target, decorators[d]||d, options[d], wire));
		}

		wire.whenAll(promises).then(
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
		var d = wire.deferred();

		require([introduction], function(resolved) {
			introduce(target, resolved);
			d.resolve();
		});

		return d;
	}
	
	function introduceFacet(introductions, promise, facet, wire) {
		var target, intros, intro, i, promises;
		
		target = facet.target;
		intros = facet.options;
		
		if(!isArray(intros)) intros = [intros];
		i = intros.length;

		promises = [];

		while((intro = intros[--i])) {
			promises.push(doIntroduction(target, introductions[intro]||intro, wire));
		}

		wire.whenAll(promises).then(
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

	function adviseFacet(aspects, promise, facet, wire) {
		promise.resolve();
	}

	function applyAspectCombined(promise, target, aspect) {
		require([aspect], function(aspect) {
			var pointcut = aspect.pointcut;

			if(pointcut) {
				aop.add(target, pointcut, aspect);
			}
			promise.resolve();
		});
	}

	function applyAspectSeparate(promise, target, pointcut, advice) {
		var modules = [advice];

		if (typeof pointcut === 'string') {
			modules.push(pointcut);
		}

		require(modules, function(aspect) {
			aop.add(target,
				arguments.length === 2 ? arguments[1] : pointcut,
				aspect);

			promise.resolve();
		});
	}

	function weave(resolver, target, wire, options) {

		function fail(e) { resolver.reject(e); }

		var aspects, aspect, a, promises, d;
		aspects = options.aspects;

		if(!aspects) {
			resolver.resolve();
			return;
		}

		promises = [];

		try {
			for (a in aspects) {
				aspect = aspects[a];

				d = wire.deferred();
				promises.push(d);

				if (typeof aspect === 'string') {
					applyAspectCombined(d, target, aspect);
				} else {
					applyAspectSeparate(d, target, aspect.pointcut, aspect.advice);
				}
			}

			wire.whenAll(promises).then(
				function() { resolver.resolve(); },
				fail
			);

		} catch(e) {
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

			function makeFacet(step, options, callback) {
				var facet = {};
				
				facet[step] = function(resolver, proxy, wire) {
					callback(options, resolver, proxy, wire);
				};

				return facet;
			}

			// Plugin
			return {
				facets: {
					decorate:  makeFacet('configure', options.decorators, decorateFacet),
					introduce: makeFacet('configure', options.introductions, introduceFacet)
				},
				create: function(resolver, proxy, wire) {
					weave(resolver, proxy.target, wire, options);
				}
			};
		}
	};
});