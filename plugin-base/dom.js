/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * dom plugin helper
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */
define(['wire/domReady', 'when', '../dom/base'], function(domReady, when, base) {

	function defaultById(id) {
		return document.getElementById(id);
	}

	function defaultQueryAll(selector, root) {
		return (root||document).querySelectorAll(selector);
	}

	function defaultQuery(selector, root) {
		return (root||document).querySelector(selector);
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
		else if(location == 'at') {
			refNode.innerHTML = '';
			_appendChild(refNode, node);
		}
		else if(location == 'last') {
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
		else {
			throw new Error('Unknown dom insertion command: ' + location);
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

	function getElementFactory (resolver, spec, wire) {
		when(wire(spec.getElement), function (element) {

			if (!element || !element.nodeType || !element.tagName) {
				throw new Error('dom: non-element reference provided to getElement');
			}

			return element;
		}).then(resolver.resolve, resolver.reject);
	}

	return function createDomPlugin(options) {

		var getById, query, first, init, addClass, removeClass, placeAt;

		getById = options.byId || defaultById;
		query = options.query || defaultQueryAll;
		first = options.first || defaultQuery;
		init = options.init;
		addClass = options.addClass;
		placeAt = options.placeAt || defaultPlaceAt;
		removeClass = options.removeClass;

		function doById(resolver, name /*, refObj, wire*/) {

			domReady(function() {
				var node;
				// if dev omitted name, they're looking for the resolver itself
				if (!name) resolver.resolve(getById);
				node = getById(name);
				if (node) {
					resolver.resolve(node);
				} else {
					resolver.reject(new Error("No DOM node with id: " + name));
				}
			});
		}

		function doQuery(name, refObj, root, queryFunc) {
			var result, i;

			result = queryFunc(name, root);

			// if dev supplied i, try to use it
			if (typeof refObj.i != 'undefined') {
				i = refObj.i;
				if (i in result) {
					return result[i];
				} else {
					throw new Error("Query '" + name + "' did not find an item at position " + i);
				}
			} else if (queryFunc == first && !result) {
				throw new Error("Query '" + name + "' did not find anything");
			} else {
				return result;
			}
		}

		function doPlaceAt(resolver, facet, wire) {
			domReady(function() {
				var futureRefNode, node, options, operation;

				options = facet.options;
				node = facet.target;

				// get first property and use it as the operation
				for (var p in options) {
					if (options.hasOwnProperty(p)) {
						operation = p;
						break;
					}
				}

				futureRefNode = wire(makeQueryRef(options[operation]));

				when(futureRefNode, function (refNode) {
					return placeAt(node, refNode, operation);
				}).then(resolver.resolve, resolver.reject);
			});
		}

		/**
		 *
		 * @param resolver {Resolver} resolver to notify when the ref has been resolved
		 * @param name {String} the dom query
		 * @param refObj {Object} the full reference object, including options
		 * @param wire {Function} wire()
		 * @param [queryFunc] {Function} the function to use to query the dom
		 */
		function resolveQuery(resolver, name, refObj, wire, queryFunc) {

			if (!queryFunc) queryFunc = query;

			domReady(function() {

				var futureRoot;

				// if dev omitted name, they're looking for the resolver itself
				if (!name) return resolver.resolve(queryFunc);

				// get string ref or object ref
				if (refObj.at && !refObj.isRoot) {
					futureRoot = wire(makeQueryRoot(refObj.at));
				}

				// sizzle will default to document if refObj.at is unspecified
				when(futureRoot, function (root) {
					return doQuery(name, refObj, root, queryFunc);
				}).then(resolver.resolve, resolver.reject);

			});

		}

		/**
		 * dom.first! resolver.
		 *
		 * @param resolver {Resolver} resolver to notify when the ref has been resolved
		 * @param name {String} the dom query
		 * @param refObj {Object} the full reference object, including options
		 * @param wire {Function} wire()
		 */
		function resolveFirst(resolver, name, refObj, wire) {
			resolveQuery(resolver, name, refObj, wire, first);
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
				var classes, resolvers, facets, factories;

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

				factories = {
					'getElement': getElementFactory
				};

				if (query) {
					resolvers['dom.first'] = createResolver(resolveFirst, options);

					// dom.all and dom.query are synonyms
					resolvers['dom.all']
						= resolvers['dom.query'] = createResolver(resolveQuery, options);
				}

				return {
					resolvers: resolvers,
					facets: facets,
					factories: factories,
					proxies: [
						base.nodeProxy
					]
				};

			}
		};
	}
});
