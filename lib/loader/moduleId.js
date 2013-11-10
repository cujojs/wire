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

	return {
		base: base,
		resolve: resolve
	};

	/**
	 * Given a moduleId, returns the "basename".  For example:
	 * base('foo/bar/baz') -> 'foo/bar'
	 * base('foo') -> 'foo'
	 * @param id
	 * @returns {*}
	 */
	function base(id) {
		if(!id) {
			return '';
		}

		var split = id.lastIndexOf('/');
		return split >= 0 ? id.slice(0, split) : id;
	}

	/**
	 * Resolve id against base (which is also an id), such that the
	 * returned resolved id contains no leading '.' or '..'
	 * components.  Id may be relative or absolute, and may also
	 * be an AMD plugin plus resource id, in which case both the
	 * plugin id and the resource id may be relative or absolute.
	 * @param {string} base module id against which id will be resolved
	 * @param {string} id module id to resolve, may be an
	 *  AMD plugin+resource id.
	 * @returns {string} resolved id with no leading '.' or '..'
	 *  components.  If the input id was an AMD plugin+resource id,
	 *  both the plugin id and the resource id will be resolved in
	 *  the returned id (thus neither will have leading '.' or '..'
	 *  components)
	 */
	function resolve(base, id) {
		if(typeof id != 'string') {
			return base;
		}

		return id.split('!').map(function(part) {
			return resolveId(base, part.trim());
		}).join('!');
	}

	function resolveId(base, id) {
		var up, prefix;

		if(id == '' || id == '.' || id == './') {
			return base;
		}

		if(id[0] != '.') {
			return id;
		}

		prefix = base;

		if(id == '..' || id == '../') {
			up = 1;
			id = '';
		} else {
			up = 0;
			id = id.replace(/^(\.\.?\/)+/, function(s) {
				s.replace(/\.\./g, function(s) {
					up++;
					return s;
				});
				return '';
			});

			if(id == '..') {
				up++;
				id = '';
			} else if(id == '.') {
				id = '';
			}
		}

		if(up > 0) {
			prefix = prefix.split('/');
			up = Math.max(0, prefix.length - up);
			prefix = prefix.slice(0, up).join('/');
		}

		if(id.length && id[0] !== '/' && prefix[prefix.length-1] !== '/') {
			prefix += '/';
		}

		if(prefix[0] == '/') {
			prefix = prefix.slice(1);
		}

		return prefix + id;
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
