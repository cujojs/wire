/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/cola plugin
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

(function(define) {
define(['when'],
function(when) {

	var isArray, undef, slice;

	function querySelector (selector, node) {
		return node.querySelector(selector);
	}

	isArray = Array.isArray || function(it) {
		return Object.prototype.toString.call(it) == '[object Array]';
	};

	slice = Array.prototype.slice;

	function createPropertyTransform(transforms, wire) {

		// Could optimize the single function/string case here
		// by avoiding the when.reduce.  If wire spec parsing perf
		// ever becomes a problem, we can optimize a bit here.

		if(!isArray(transforms)) {
			transforms = [transforms];
		}

		return when.reduce(transforms,
			function(txList, txSpec) {
				var name;

				if(typeof txSpec == 'function') {
					return txSpec;
				}

				// Determine the name of the transform and try
				// to resolve it as a component in the current
				// wire spec
				if(typeof txSpec == 'string') {
					name = txSpec;
				} else {
					for(name in txSpec) {
						if(name != 'inverse') break;
					}
				}

				return when(wire.resolveRef(name),
					function(transform) {
						txList.push(function() {
							var args = slice.call(arguments);
							return transform.apply(undef, args.concat(txSpec[name]));
						});
						return txList;
					}
				);
			}, [])
		.then(
			function(txList) {
				return txList.length > 1 ? compose(txList) : txList[0];
			}
		);
	}

	function setupBinding(bindingSpecs, name, wire) {
		var bindingSpec, binding;

		bindingSpec = copyOwnProps(bindingSpecs[name]);
		binding = {
			name: name,
			spec: bindingSpec
		};

		return bindingSpec.transform
			? when(createPropertyTransform(bindingSpec.transform, wire),
				function(propertyTransform) {
					binding.spec.transform = propertyTransform;
					return binding;
				})
			: binding;
	}

	function setupBindings(bindingSpecs, wire) {
		var promises = [];

		for(var name in bindingSpecs) {
			if(bindingSpecs.hasOwnProperty(name)) {
				promises.push(setupBinding(bindingSpecs, name, wire));
			}
		}

		return when.reduce(promises, function(bindings, bindingSpec) {
			bindings[bindingSpec.name] = bindingSpec.spec;
			return bindings;
		}, {});
	}

	function doBind(facet, options, wire) {
		var target = facet.target;

		options = copyOwnProps(facet.options, options);

		return when(wire(options), function(options) {
			var hubOptions, to, bindings;

			to = options.to;
			if(!to) {
				throw new Error('wire/cola: "to" must be specified');
			}

			bindings = options.bindings;

			delete options.to;
			delete options.bindings;

			hubOptions = copyOwnProps(options);

			if(!hubOptions.querySelector) {
				hubOptions.querySelector = querySelector;
			}

			return when(setupBindings(bindings, wire),
				function(bindings) {
					hubOptions.bindings = copyOwnProps(bindings);
					to.addSource(target, hubOptions);
					return target; // doesn't matter what we return here
				}
			);
		});
	}

	/**
	 * Copies own properties from each src object in the arguments list
	 * to a new object and returns it.  Properties further to the right
	 * win.
	 *
	 * @return {Object} a new object with own properties from all srcs.
	 */
	function copyOwnProps(/*srcs...*/) {
		var i, len, p, src, dst;

		dst = {};

		for(i = 0, len = arguments.length; i < len; i++) {
			src = arguments[i];
			if(src) {
				for(p in src) {
					if(src.hasOwnProperty(p)) {
						dst[p] = src[p];
					}
				}
			}
		}

		return dst;
	}

	/**
	 * We don't want to copy the module property from the plugin options, and
	 * wire adds the id property, so we need to filter that out too.
	 * @type {Object}
	 */
	var excludeOptions = {
		id: 1,
		module: 1
	};

	return {
		wire$plugin: function(ready, destroyed, pluginOptions) {

			var options = {};

			for(var p in pluginOptions) {
				if(!(p in excludeOptions)) {
					options[p] = pluginOptions[p];
				}
			}

			function bindFacet(resolver, facet, wire) {
				when.chain(doBind(facet, options, wire), resolver);
			}

			return {
				facets: {
					bind: {
						ready: bindFacet
					}
				}
			};
		}
	};
});

})(typeof define == 'function'
	// use define for AMD if available
	? define
	: function(deps, factory) {
		module.exports = factory.apply(this, deps.map(function(x) {
			return require(x);
		}));
	}
);
