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

	function defaultQueryAll(selector, root) {
		return (root||document).querySelectorAll(selector);
	}

	/**
	 * Places a node into the DOM at the location specified around
	 * a reference node.
	 * Note: replace is problematic if the dev expects to use the node
	 * as a wire component.  The component reference will still point
	 * at the node that was replaced.
	 * @private
	 * @param node {HTMLElement}
	 * @param refNode {HTMLElement}
	 * @param location {String} or {Number} "before", "after", "first", "last",
	 *   or the position within the children of refNode
	 */
	function defaultPlaceAt(node, refNode, location) {
		var parent;

		parent = refNode.parentNode;

		// `if else` is more compressible than switch
		if (!isNaN(location)) {
			if (location < 0) {
				location = 0;
			}
			_insertBefore(refNode, node, refNode.childNodes[location]);
		}
		else if(location == 'last' || !location) {
			_appendChild(refNode, node);
		}
		else if(location == 'first') {
			_insertBefore(refNode, node, refNode.firstChild);
		}
		else if(location == 'before') {
			// TODO: throw if parent missing?
			_insertBefore(parent, node, refNode);
		}
		else if(location == 'after') {
			// TODO: throw if parent missing?
			if (refNode == parent.lastChild) {
				_appendChild(parent, node);
			}
			else {
				_insertBefore(parent, node, refNode.nextSibling);
			}
		}

		return node;
	}

	// these are for better compressibility since compressors won't
	// compress native DOM methods.
	function _insertBefore(parent, node, refNode) {
		parent.insertBefore(node, refNode);
	}

	function _appendChild(parent, node) {
		parent.appendChild(node);
	}

	return function(options) {

		var getById, query, init, addClass, removeClass, placeAt;

		getById = options.byId || defaultById;
		query = options.query || defaultQueryAll;
		init = options.init;

		addClass = options.addClass;
		removeClass = options.removeClass;

		placeAt = options.placeAt || defaultPlaceAt;

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

		function doPlaceAt(resolver, facet, wire) {
			domReady(function() {
				var futureRefNode, node, options;

				options = facet.options;
				node = facet.target;

				futureRefNode = wire(makeQueryRef(options.at));

				when(futureRefNode, function (refNode) {
					return placeAt(node, refNode, options.where);
				}).then(resolver.resolve, resolver.reject);
			});
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
				var classes, resolvers, facets;

				options.at = makeQueryRoot(options.at);

				if (init) init(ready, destroyed, options);

				classes = options.classes;

				// Add/remove lifecycle classes if specified
				if (classes) {
					domReady(function () {
						var node = document.getElementsByTagName('html')[0];

						// Add classes for wiring start
						handleClasses(node, classes.init);

						// Add/remove classes for context ready
						ready.then(function () {
							handleClasses(node, classes.ready, classes.init);
						});

						if (classes.ready) {
							// Remove classes for context destroyed
							destroyed.then(function () {
								handleClasses(node, null, classes.ready);
							});
						}
					});
				}

				resolvers = {
					'dom': doById
				};

				facets = {
					'insert': {
						initialize: doPlaceAt
					}
				};

				if (query) {
					resolvers['dom.first'] = createResolver(resolveFirst, options);

					// dom.all and dom.query are synonyms
					resolvers['dom.all']
						= resolvers['dom.query'] = createResolver(resolveQuery, options);
				}

				return {
					resolvers: resolvers,
					facets: facets
				};

			}
		};
	}
});
