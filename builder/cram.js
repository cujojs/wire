/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/cram/builder plugin
 * Builder plugin for cram
 * https://github.com/cujojs/cram
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
(function(define) {
define(function() {

	var defaultModuleRegex, replaceIdsRegex;
	// default dependency regex
	defaultModuleRegex = /\.(module|create)$/;
	// adapted from cram's scan function:
	//replaceIdsRegex = /(define)\s*\(\s*(?:\s*["']([^"']*)["']\s*,)?(?:\s*\[([^\]]+)\]\s*,)?\s*(function)?\s*(?:\(([^)]*)\))?/g;
	replaceIdsRegex = /(define)\s*\(\s*(?:\s*["']([^"']*)["']\s*,)?(?:\s*\[([^\]]*)\]\s*,)?/;

	return {
		normalize: normalize,
		compile: compile
	};

	function normalize(resourceId, toAbsId) {
		return resourceId ? toAbsId(resourceId.split("!")[0]) : resourceId;
	}

	function compile(wireId, resourceId, require, io, config) {
		// Track all modules seen in wire spec, so we only include them once
		var specIds, defines, remaining, seenModules, childSpecRegex,
			moduleRegex, countdown;

		defines = [];
		seenModules = {};
		moduleRegex = defaultModuleRegex;

		// Get config values
		if(config) {
			if(config.moduleRegex) moduleRegex = new RegExp(config.moduleRegex);
			if(config.childSpecRegex) childSpecRegex = new RegExp(config.childSpecRegex);
		}

		// Grab the spec module id, *or comma separated list of spec module ids*
		// Split in case it's a comma separated list of spec ids
		specIds = resourceId.split(',');
		remaining = specIds.length;

		// get all the specs
		countdown = createCountdown(remaining, processSpec, null, io.error);
		specIds.forEach(function(id) {
			require(
				[id],
				function (spec) { countdown(spec, id); },
				io.error
			);
		});

		// For each spec id, add the spec itself as a dependency, and then
		// scan the spec contents to find all modules that it needs (e.g.
		// "module" and "create")
		function processSpec(spec, specId) {
			var dependencies;

			dependencies = [];

			addDependency(wireId);
			scanObj(spec);
			generateDefine(specId, dependencies);

			function scanObj(obj, path) {
				// Scan all keys.  This might be the spec itself, or any sub-object-literal
				// in the spec.
				for (var name in obj) {
					scanItem(obj[name], createPath(path, name));
				}
			}

			function scanItem(it, path) {
				// Determine the kind of thing we're looking at
				// 1. If it's a string, and the key is module or create, then assume it
				//    is a moduleId, and add it as a dependency.
				// 2. If it's an object or an array, scan it recursively
				if (isDep(path) && typeof it === 'string') {
					// Get module def
					addDependency(it);

				} else if (isStrictlyObject(it)) {
					// Descend into subscope
					scanObj(it, path);

				} else if (Array.isArray(it)) {
					// Descend into array
					var arrayPath = path + '[]';
					it.forEach(function(arrayItem) {
						scanItem(arrayItem, arrayPath);
					});
				}
			}

			function addDependency(moduleId) {
				if(!(moduleId in seenModules)) {
					dependencies.push(moduleId);
				}
			}
		}

		function generateDefine(specId, dependencies) {
			var buffer;

			io.read(ensureExtension(specId, 'js'), function(specText) {
				buffer = injectIds(specText, specId, dependencies);

				defines.push(buffer);

				if(!--remaining) {
					done();
				}
			}, io.error);
		}

		function done() {
			io.write(defines.join('\n'));
		}

		function isDep(path) {
			return moduleRegex.test(path);
		}

		function createPath(path, name) {
			return path ? (path + '.' + name) : name
		}
	}

	function isStrictlyObject(it) {
		return (it && Object.prototype.toString.call(it) == '[object Object]');
	}

	function createCountdown(howMany, each, done, fail) {
		return function() {
			var result;
			try {
				if(--howMany >= 0) result = each.apply(this, arguments);
				if(howMany == 0 && done) done();
				return result;
			} catch(ex) {
				error(ex);
			}
		};
		function error(ex) {
			howMany = 0;
			if(fail) fail(ex);
		}
	}

	function ensureExtension(id, ext) {
		return id.lastIndexOf('.') <= id.lastIndexOf('/')
			? id + '.' + ext
			: id;
	}

	function injectIds (moduleText, absId, moduleIds) {
		// note: replaceIdsRegex removes commas, parens, and brackets
		return moduleText.replace(replaceIdsRegex, function (m, def, mid, depIds) {

			// merge deps, but not args since they're not referenced in module
			if (depIds) moduleIds = moduleIds.concat(depIds);

			moduleIds = moduleIds.map(quoted).join(', ');
			if (moduleIds) moduleIds = '[' + moduleIds + '], ';

			return def + '(' + quoted(absId) + ', ' + moduleIds;
		});
	}

	function quoted (id) {
		return '"' + id + '"';
	}

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(); }));
