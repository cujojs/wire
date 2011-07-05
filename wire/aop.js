/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: aop.js
*/
define(['require', 'wire', 'wire/lib/aop'], function(require, globalWire, aop) {

	var ap, obj, tos;
	
	ap = Array.prototype;
	obj = {};
	tos = Object.prototype.toString;

	function isArray(it) {
		return tos.call(it) == '[object Array]';
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

	function weave(resolver, target, wiredAspects) {
		var aspect;
		try {
			for (var a in wiredAspects) {
				aspect = wiredAspects[a];
				if (aspect.pointcut) {
					aop.add(target, aspect.pointcut, aspect);
				}

			}

			resolver.resolve();
			
		} catch(e) {
			resolver.reject(e);
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
			var wiredOptions = {};

			function whenOptions(key, wire) {
				var wired = wiredOptions[key];
				if(!wired) {
					wired = wiredOptions[key] = wire.deferred();
					globalWire(options[key]).then(
						function(w) { wired.resolve(w); },
						function(e) { wired.reject(e); }
					);
				}

				return wired;
			}

			function makeFacet(step, name, callback) {
				var facet = {};
				facet[step] = function(resolver, facet, wire) {
					whenOptions(name, wire).then(
						function(wiredOpts) {
							callback(wiredOpts, resolver, facet, wire);
						}
					)
				};

				return facet;
			}

			// Plugin
			return {
				facets: {
					decorate:  makeFacet('configure', 'decorators', decorateFacet),
					introduce: makeFacet('configure', 'introductions', introduceFacet),
					advise:    makeFacet('create', 'aspects', adviseFacet)
				},
				listener: {
					create: function(resolver, proxy, wire) {
						whenOptions('aspects', wire).then(function(wiredAspects) {
							weave(resolver, proxy.target, wiredAspects);
						});
					}
				}
			};
		}
	};
});