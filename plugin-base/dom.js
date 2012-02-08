/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * dom plugin helper
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(['wire/domReady', 'when'], function(domReady, when) {

	function defaultById(id) {
		return document.getElementById(id);
	}

	return function(options) {

		var getById, query, init, addClass, removeClass;

		getById = options.byId || defaultById;
		query = options.query || document.querySelectorAll;
		init = options.init;

		addClass = options.addClass;
		removeClass = options.removeClass;

		function doById(resolver, name /*, refObj, wire*/) {
			domReady(function() {
				var node = getById(name);
				if(node) {
					resolver.resolve(node);
				} else {
					resolver.reject(new Error("No DOM node with id: " + name));
				}
			});
		}


		function doQuery(name, refObj, root) {
			var result, i;

			result = query(name, root);
			i = refObj.i;

			if (typeof i == 'number') {
				if (i < result.length) {
					return result[i];
				} else {
					throw new Error("Query '" + name + "' returned " + result.length + " items while expecting at least " + (i + 1));
				}
			} else {
				return result;
			}
		}

		function resolveQuery(resolver, name, refObj, wire) {

			domReady(function() {

				var futureRoot;

				// get string ref or object ref
				if (refObj.at && !refObj.isRoot) {
					futureRoot = wire(makeQueryRoot(refObj.at));
				}

				// sizzle will default to document if refObj.at is unspecified
				when(futureRoot, function (root) {
					return doQuery(name, refObj, root);
				}).then(resolver.resolve, resolver.reject);

			});

		}

		/**
		 * dom.first! resolver.  Since sizzle supports :first, we can optimize dom.first
		 * by adding :first if it's not already there.
		 *
		 * @param resolver {Resolver} resolver to notify when the ref has been resolved
		 * @param name {String} the dom query
		 * @param refObj {Object} the full reference object, including options
		 * @param wire {Function} wire()
		 */
		function resolveFirst(resolver, name, refObj, wire) {
			refObj.i = 0;
			resolveQuery(resolver, name, refObj, wire);
		}

		function makeQueryRoot(ref) {

			var root = makeQueryRef(ref);

			if(root) {
				root.isRoot = true;
			}

			return root;
		}

		function makeQueryRef(ref) {
			return typeof ref == 'string' ? { $ref: ref } : ref;
		}

		function createResolver(resolverFunc, options) {
			return function(resolver, name, refObj, wire) {
				if(!refObj.at) {
					refObj.at = options.at;
				} else {
					refObj.at = makeQueryRoot(refObj.at);
				}

				return resolverFunc(resolver, name, refObj, wire);
			}
		}

		function handleClasses(node, add, remove) {
			if(add) addClass(node, add);
			if(remove) removeClass(node, remove);
		}

		return {
			wire$plugin: function(ready, destroyed, options) {

				options.at = makeQueryRoot(options.at);

				if(init) init(ready, destroyed, options);

				var classes;

				classes = options.classes;

				// Add/remove lifecycle classes if specified
				if(classes) {
					domReady(function() {
						var node = document.getElementsByTagName('html')[0];

						// Add classes for wiring start
						handleClasses(node, classes.init);

						// Add/remove classes for context ready
						ready.then(function() { handleClasses(node, classes.ready, classes.init); });

						if(classes.ready) {
							// Remove classes for context destroyed
							destroyed.then(function() { handleClasses(node, null, classes.ready); });
						}
					});
				}

				var resolvers = {
					'dom': doById
				};

				if(query) {
					resolvers['dom.first'] = createResolver(resolveFirst, options);

					// dom.all and dom.query are synonyms
					resolvers['dom.all']
						= resolvers['dom.query'] = createResolver(resolveQuery, options);
				}

				return {
					resolvers: resolvers
				};

			}
		};
	}
});
