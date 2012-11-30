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

	var defaultModuleRegex;
	// default dependency regex
	defaultModuleRegex = /\.(module|create)$/;

	return {
		normalize: normalize,
		compile: compile
	};

	function normalize(resourceId, toAbsId) {
		return resourceId ? toAbsId(resourceId.split("!")[0]) : resourceId;
	}

	function compile(absId, require, io, config) {
		// Track all modules seen in wire spec, so we only include them once
		var wireId, resourceId, specIds, defines, remaining, seenModules, childSpecRegex, moduleRegex;

		wireId = absId.split('!');
		resourceId = wireId[1];
		wireId = wireId[0];

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

		// For each spec id, add the spec itself as a dependency, and then
		// scan the spec contents to find all modules that it needs (e.g.
		// "module" and "create")
		specIds.forEach(processSpec);

		function processSpec(specId) {
			var dependencies;

			dependencies = [];

			addDependency(wireId);
			scanObj(require(specId));
			generateDefine(dependencies);

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

		function generateDefine(dependencies) {
			var buffer;

			io.read(resourceId, function(specText) {
				buffer = 'define("' + resourceId + '",\n[';
				buffer += dependencies.map(function(id) {
					return '"' + id + '"'
				}).join(',');
				buffer += '], function() {\nreturn ' + specText + '}\n);';

				defines.push(buffer);

				if(!--remaining) {
					done();
				}
			});
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

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(); }));
