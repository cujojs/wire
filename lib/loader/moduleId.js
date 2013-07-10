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

	function resolve(base, id) {
		var up, prefix;

		if(typeof id != 'string') {
			return base;
		}

		id = id.trim();

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

	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));
