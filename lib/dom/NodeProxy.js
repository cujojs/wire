/** @license MIT License (c) copyright 2010-2013 original author or authors */

/**
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author: Brian Cavalier
 * @author: John Hann
 */

(function(define) { 'use strict';
define(function() {

	var nodeProxyInvoke;

	if (document && document.appendChild.apply) {
		// normal browsers
		nodeProxyInvoke = function jsInvoke (node, method, args) {
			if(typeof method == 'string') {
				method = node[method];
			}
			return method.apply(node, args);
		};
	}
	else {
		// IE 6-8 ("native" methods don't have .apply()) so we have
		// to use eval())
		nodeProxyInvoke = function evalInvoke (node, method, args) {
			var argsList;

			if(typeof method == 'function') {
				return method.apply(node, args);
			}

			// iirc, no node methods have more than 4 parameters
			// (addEventListener), so 5 should be safe. Note: IE needs
			// the exact number of arguments or it will throw!
			argsList = ['a', 'b', 'c', 'd', 'e'].slice(0, args.length).join(',');

			// function to execute eval (no need for global eval here
			// since the code snippet doesn't reference out-of-scope vars).
			function invoke (a, b, c, d, e) {
				/*jshint evil:true*/
				return eval('node.' + method + '(' + argsList + ');');
			}

			// execute and return result
			return invoke.apply(this, args);
		};
	}

	function NodeProxy() {}

	NodeProxy.prototype = {
		get: function (name) {
			var node = this.target;

			if (name in node) {
				return node[name];
			}
			else {
				return node.getAttribute(name);
			}
		},

		set: function (name, value) {
			var node = this.target;

			if (name in node) {
				return node[name] = value;
			}
			else {
				return node.setAttribute(name, value);
			}
		},

		invoke: function (method, args) {
			return nodeProxyInvoke(this.target, method, args);
		},

		destroy: function () {
			var node = this.target;

			// if we added a destroy method on the node, call it.
			// TODO: find a better way to release events instead of using this mechanism
			if (node.destroy) {
				node.destroy();
			}
			// removal from document will destroy node as soon as all
			// references to it go out of scope.
			var parent = node.parentNode;
			if (parent) {
				parent.removeChild(node);
			}
		},

		clone: function (options) {
			if (!options) {
				options = {};
			}
			// default is to clone deep (when would anybody not want deep?)
			return this.target.cloneNode(!('deep' in options) || options.deep);
		}
	};

	return NodeProxy;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
