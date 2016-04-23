/* jshint esversion: 6 */
(function(define){define(function(require){
'use strict';

(function(buster, context) {

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

sentinel = {};

function createContext(spec) {
	return context.call(null, spec, null, { require: require });
}

class es6Class
{
	constructor () {
		this.constructorRan = true;
		this.args = Array.prototype.slice.call(arguments);
	}

	someMethod() {

	}
}

buster.testCase('es6/lib/plugin/basePlugin', {
	'clone factory': {
		'should call constructor when cloning an object with an es6 constructor': function() {
			class FabulousEs6 {
				constructor () {
					this.instanceProp = 'instanceProp';
				}
			}
			FabulousEs6.prototype.prototypeProp = 'prototypeProp';

			return createContext({
				fab: {
					create: FabulousEs6
				},
				copy: {
					clone: { $ref: 'fab' }
				}
			}).then(
				function(context) {
					assert.defined(context.copy, 'copy is defined');
					assert.defined(context.copy.prototypeProp, 'copy.prototypeProp is defined');
					assert.defined(context.copy.instanceProp, 'copy.instanceProp is defined');
					refute.same(context.copy, context.fab);
				},
				fail
			);
		}
	},

	'create factory': {
		'should call es6 constructor': function() {
			return createContext({
				test: {
					create: {
						module: es6Class,
					}
				}
			}).then(
				function(context) {
					assert(context.test.constructorRan);
				},
				fail
			);
		},

		'should call es6 constructor functions with args': function() {
			return createContext({
				test: {
					create: {
						module: es6Class,
						args: [1, 'foo', 1.7]
					}
				}
			}).then(
				function(context) {
					assert(context.test instanceof es6Class);
					assert.equals(context.test.args, [1, 'foo', 1.7]);
				},
				fail
			);
		},
	}
});
})(
	require('buster'),
	require('../../../../lib/context')
);

});})(typeof define !== 'undefined' ? define : function(factory){module.exports = factory(require);});
