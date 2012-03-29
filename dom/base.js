/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * wire/dom/base
 * provides basic dom creation capabilities for plugins.
 *
 * wire is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 */

define(function () {

	var classRx, trimLeadingRx, splitClassNamesRx, nodeProxyInvoke;

	classRx = '(\\s+|^)classNames(\\b(?![\\-_])|$)';
	trimLeadingRx = /^\s+/;
	splitClassNamesRx = /(\b\s+\b)|\s+/;

	/**
	 * Adds one or more css classes to a dom element.
	 * @param el {HTMLElement}
	 * @param className {String} a single css class or several, space-delimited
	 *   css classes.
	 */
	function addClass (el, className) {
		var newClass;

		newClass = _stripClass(el.className, className);

		el.className = (newClass ? newClass + ' ' : '') + className;
	}

	/**
	 * Removes one or more css classes from a dom element.
	 * @param el {HTMLElement}
	 * @param className {String} a single css class or several, space-delimited
	 *   css classes.
	 */
	function removeClass (el, className) {
		el.className = _stripClass(el.className, className);
	}

	/**
	 * Adds or removes one or more css classes from a dom element.
	 * @param el {HTMLElement}
	 * @param className {String} a single css class or several, space-delimited
	 *   css classes.
	 */
	function toggleClass (el, className) {
		var unalteredClass;

		// save copy of what _stripClass would return if className
		// was not found
		unalteredClass = el.className.replace(trimLeadingRx, '');

		// remove className
		el.className = _stripClass(el.className, className);

		// add className if it wasn't removed
		if (unalteredClass == el.className) {
			el.className += ' ' + className;
		}
	}

	/**
	 * Super fast, one-pass, non-looping routine to remove one or more
	 * space-delimited tokens from another space-delimited set of tokens.
	 * @private
	 * @param tokens
	 * @param removes
	 */
	function _stripClass (tokens, removes) {
		var rx;

		if (!removes) return tokens;

		// convert space-delimited tokens with bar-delimited (regexp `or`)
		removes = removes.replace(splitClassNamesRx, function (m, inner, edge) {
			// only replace inner spaces with |
			return edge ? '' : '|';
		});

		// create one-pass regexp
		rx = new RegExp(classRx.replace('classNames', removes), 'g');

		// remove all tokens in one pass (wish we could trim leading
		// spaces in the same pass! at least the trim is not a full
		// scan of the string)
		return tokens.replace(rx, '').replace(trimLeadingRx, '');
	}

	if (document && document.appendChild.apply) {
		// normal browsers
		nodeProxyInvoke = function jsInvoke (node, method, args) {
			return node[method].apply(node, args);
		};
	}
	else {
		// IE 6-8 ("native" methods don't have .apply()) so we have
		// to use eval())
		nodeProxyInvoke = function evalInvoke (node, method, args) {
			var argsList;

			// iirc, no node methods have more than 4 parameters
			// (addEventListener), so 5 should be safe. Note: IE needs
			// the exact number of arguments or it will throw!
			argsList = ['a', 'b', 'c', 'd', 'e'].slice(0, args.length).join(',');

			// function to execute eval (no need for global eval here
			// since the code snippet doesn't reference out-of-scope vars).
			function invoke (a, b, c, d, e) {
				return eval('node.' + method + '(' + argsList + ');');
			}

			// execute and return result
			return invoke.apply(this, args);
		};
	}

	function nodeProxy (node) {

		if (!node.nodeType || !node.setAttribute || !node.getAttribute) return;

		return {

			get: function (name) {
				if (name in node) {
					return node[name];
				}
				else {
					return node.getAttribute(name);
				}
			},

			set: function (name, value) {
				if (name in node) {
					return node[name] = value;
				}
				else {
					return node.setAttribute(name, value);
				}
			},

			invoke: function (method, args) {
				return nodeProxyInvoke(node, method, args);
			},

			destroy: function () {
				// if we added a destroy method on the node, call it.
				// TODO: find a better way to release events instead of using this mechanism
				if (node.destroy) node.destroy();
				// removal from document will destroy node as soon as all
				// references to it go out of scope.
				var parent = node.parentNode;
				if (parent) parent.removeChild(node);
			}
		};
	}

	return {

		addClass: addClass,
		removeClass: removeClass,
		toggleClass: toggleClass,
		nodeProxy: nodeProxy

	};

});