(function (define) {
define(['wire/dom/base', 'when'], function (base, when) {
	"use strict";

	var splitAtSpacesOrCommasRx,
		isString,
		undef;

	// TODO: this regexp captures the blanks before commas
	splitAtSpacesOrCommasRx = /\s*,\s*|\s+/;

	/**
	 * Creates a proxy that makes adding and removing oocss states simpler.
	 * @param element {HTMLElement}
	 * @param stateGroups {Object} required, but can be an empty object
	 * @return {Object}
	 *
	 * @description The most tedious part of handling oocss states is
	 * managing sets (groups) of classes. Typically, you want to apply a
	 * new subset of a group of classes while removing others in the group
	 * as one atomic operation. Keeping track of which ones to add and which
	 * ones to remove requires tedious code.  This proxy allows you to define
	 * groups of css classes in advance.  Then, any time you add a css class,
	 * any other classes in the group are removed.
	 */
	function oocssProxy (element, stateGroups) {
		var master, lookup;

		master = normalizeMaster(stateGroups);
		lookup = createGroupLookup(master);

		return {

			/**
			 *
			 * @param classes {String|Array|Object} a space-delimited* set of
			 *   oocss states or an array of oocss states (css class names).
			 *   *Note: commas are also acceptable as delimiters.
			 *
			 * @example 1
			 * The following are all equivalent if the "disabled" and "admin"
			 * state groups have been properly configured (and have unique keys):
			 *   var set = oocss.setState;
			 *   set(mynode, [ "view-disabled", "rights-edit", "rights-view" ]);
			 *   set(mynode, "view-disabled rights-edit rights-view");
			 *   set(mynode, [ "rights-edit", "rights-view" ]);
			 *   set(mynode, "rights-edit rights-view");
			 */
			setState: function (classes) {
				var classNames;
				classes = normalizeStates(classes, lookup);
				classNames = parseClassNames(classes, master);
				return element.className = spliceClassNames(element.className, classNames.removes, classNames.adds);
			},

			/**
			 * Returns an object whose keys are (a subset) of the groups
			 * defined in setStateGroups and whose values are a subset
			 * of all the possible class names.  Only the groups and
			 * class names currently set on the node are returned.
			 * @return {Object}
			 */
			getState: function () {
				return statesFromString(element.className, master);
			},

			setStateGroups: function (newMaster) {
				master = normalizeMaster(newMaster);
				return master;
			},

			getStateGroups: function () {
				return master;
			}

		};
	}

	/**
	 * Converts a string of classNames to an object whose property names
	 * are group names and whose values are strings representing
	 * the class names found ineach group.  The object represents the
	 * partial set of class names out of all class names in all groups.
	 * @private
	 * @param string
	 */
	function statesFromString (string, master) {
		var groups, gname;
		groups = {};
		for (gname in master) {
			groups[gname] = master[gname].fromClassNames(string);
		}
		return groups;
	}

	/**
	 * Convert from tokenized string or an object of arrays or strings.
	 * The tokens in the string could be prefixed with tokens or not.
	 * @private
	 * @param states {Array|String}
	 *   [ "view-disabled", "rights-edit", "rights-view" ]
	 *   "view-disabled rights-edit rights-view"
	 * @return {Object}
	 *   { disabled: "view-disabled", rights: "edit view" }
	 */
	function normalizeStates (states, lookup) {
		var groups, gname, i, group;

		groups = {};

		if (isString(states)) {
			// convert to array, remove commas
			states = states.split(splitAtSpacesOrCommasRx);
		}

		for (i = 0; i < states.length; i++) {
			// lookup group name (gname)
			gname = lookup[states[i]];
			if (!groups[gname]) groups[gname] = [];
			groups[gname].push(states[i]);
		}

		for (gname in groups) {
			group = groups[gname];
			// convert to string
			groups[gname] = group.join(' ');
		}

		return groups;
	}

	/**
	 * Converts to the most efficient internal format and splits the
	 * mappings (of javascript-friendly state names to css classNames)
	 * into a separate object.
	 * @private
	 * @param master {Object}
	 *	{
	 *	   disabled: "view-enabled view-disabled",
	 *	   rights: "rights-edit rights-view"
	 *	}
	 *	{
	 *	   disabled: [ "view-enabled", "view-disabled" ],
	 *	   rights: [ "rights-edit", "rights-view" ]
	 *	}
	 *@return {Object} each value is an array of the states that also has
	 *   an additional string property and a stateMap property
	 *	{
	 *	   disabled: [ "view-disabled", "view-enabled" ],
	 *	   rights: [ "rights-edit", "rights-view" ]
	 *	}
	 */
	function normalizeMaster (master) {
		var normalized, gname;

		normalized = {};

		for (gname in master) {
			// wire 0.8 requires hasOwnProperty
			if (master.hasOwnProperty(gname)) {
				normalized[gname] = normalizeGroup(master[gname]);
			}
		}

		return normalized;
	}

	function normalizeGroup (group) {
		var string;

		if (isString(group)) {
			// removes commas while it splits
			group = group.split(splitAtSpacesOrCommasRx);
		}

		// pre-processing and convenience functions
		string = group.join(' ');
		group.toString = function () {
			return string;
		};

		return group;
	}

	/**
	 * Creates a hash map to look up a class group (array) from a class name.
	 * @private
	 * @param master {Object}
	 * @return {Object}
	 */
	function createGroupLookup (master) {
		var lookup, gname, i, state;

		lookup = {};

		for (gname in master) {
			for (i = 0; i < master[gname].length; i++) {
				state = master[gname][i];
				lookup[state] = gname;
			}
		}

		return lookup;
	}

	function parseClassNames (normalized, master) {
		var adds, removes, gname;

		adds = [];
		removes = [];

		for (gname in normalized) {
			if (gname in master) {
				adds = adds.concat(normalized[gname]);
				removes = removes.concat(master[gname]);
			}
			else {
				// TODO: does this even work?
				// should we allow dev to include non-translated classNames?
				adds = adds.concat(normalized[gname]);
			}
		}

		return { adds: adds.join(' '), removes: removes.join(' ') };
	}

	/***** wire plugin stuff *****/

	function extendNodeProxy (baseNodeProxy) {
		return function nodeProxyWithclassMap (node) {
			var proxy = baseNodeProxy(node);

			if (proxy) {
				proxy = addCssStateHandlingToProxy(proxy, node);
			}

			return proxy;
		};
	}

	function addCssStateHandlingToProxy (proxy, element) {
		var getter, setter, scope, master, lookup;

		getter = proxy.get;
		setter = proxy.set;

		scope = oocssProxy(element, {});
		master = scope.getStateGroups();
		lookup = createGroupLookup(master);

		proxy.get = function getCssState (name) {
			if ('classState' == name) {
				// use the proxy to get className in case some other plugin
				// has overridden the proxy's method for getting className
				return normalizeStates(getter('className'), lookup);
			}
			else if ('stateMap' == name) {
				// Note: scope has been normalized
				return scope.getStateGroups();
			}
			return getter(name);
		};

		proxy.set = function setCssState (name, value) {
			if ('classState' == name) {
				// use the proxy to set className in case some other proxy
				// has overridden the proxy's method for setting className
				var tokens, classNames;
				tokens = normalizeStates(value, lookup);
				classNames = parseClassNames(tokens, master);
				value = spliceClassNames(getter('className'), classNames.removes, classNames.adds);
			}
			else if ('stateMap' == name) {
				scope = scope.setStateGroups(value);
				return scope;
			}
			return setter(name, value);
		};

		return proxy;

	}

	oocssProxy.wire$plugin = function (ready, destroyed, options) {
		base.nodeProxy = extendNodeProxy(base.nodeProxy);
		return {
			facets: {
				// TODO: is this convenient as a facet or should we just let devs use the stateMap pseudo-property?
				stateGroups: {
					configure: configureClassMap
				}
			}
		};
	};

	function configureClassMap (resolver, facet, wire) {
		when(wire(facet.options),
			function (master) {

				return facet.set('stateMap', master);

			}).then(resolver.resolve, resolver.reject);
	}

	/***** type detectors *****/

	isString = (function (toString) {
		return function (obj) {
			return toString.call(obj) == '[object String]';
		};
	}(Object.prototype.toString));

	/***** borrowed from and improved upon cola/classList *****/

	var removeRxParts, trimLeadingRx;

	removeRxParts = ['(\\s+|^)(', ')(\\b(?![\\-_])|$)'];
	trimLeadingRx = /^\s+/;

	/**
	 * Adds and removes class names to a tokenized, space-delimited string.
	 * @private
	 * @param className {String} current set of tokens
	 * @param removes {String} tokens to remove
	 * @param adds {String} tokens to add (note: required!)
	 * @returns {String} modified tokens
	 */
	function spliceClassNames (className, removes, adds) {
		var rx, strip, leftovers;
		// create regex to find all removes *and adds* since we're going to
		// remove them all to prevent duplicates.
		removes = removes.replace(/\s+/g, '|');
		rx = new RegExp(removeRxParts.join(removes), 'g');
		// remove and clean up whitespace
		leftovers = className.replace(rx, '').replace(trimLeadingRx, '');
		// put the adds back in
		return leftovers && adds ? leftovers + ' ' + adds : adds;
	}

	return oocssProxy;

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (deps, factory) { module.exports = factory(deps.map(require)); }
));
