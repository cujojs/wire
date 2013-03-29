(function(buster, context) {
'use strict';

var assert, refute, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};

function createContext(spec) {
	return context.call(null, spec, null, { require: require });
}

buster.testCase('lib/plugin/basePlugin', {
	'literal factory': {
		'should use value verbatim': function(done) {
			createContext({
				test: {
					literal: { module: 'fake' }
				}
			}).then(
				function(context) {
					assert.equals(context.test.module, 'fake')
				},
				fail
			).then(done, done);
		},

		'should not resolve references': function(done) {
			createContext({
				test: {
					literal: { x: { $ref: 'fake' } }
				}
			}).then(
				function(context) {
					assert.equals(context.test.x.$ref, 'fake')
				},
				fail
			).then(done, done);
		}
	},

	'init facet': {
		'should call method with arguments': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						init: function(val) { result = val; }
					},
					init: { init: 2 }
				}
			}).then(
				function() {
					assert.equals(result, 2);
				},
				fail
			).then(done, done);
		},

		'should abort if method throws': function(done) {
			createContext({
				test: {
					literal: {
						init: function() { throw sentinel; }
					},
					init: 'init'
				}
			}).then(
				fail,
				function(e) {
					assert.same(e, sentinel);
				}
			).then(done, done);
		},

		'should allow returning a promise': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						init: function() {
							return { then: function(f) { f(result = sentinel); } };
						}
					},
					init: { init: 1 }
				}
			}).then(
				function() {
					assert.equals(result, sentinel);
				},
				fail
			).then(done, done);
		},

		'should abort if method returns a rejected promise': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						init: function() {
							return { then: function(f, r) { r(result = sentinel); } };
						}
					},
					init: { init: 1 }
				}
			}).then(
				fail,
				function() {
					assert.equals(result, sentinel);
				}
			).then(done, done);
		}
	},

	'ready facet': {
		'should call method with arguments': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						ready: function(val) { result = val; }
					},
					ready: { ready: 2 }
				}
			}).then(
				function() {
					assert.equals(result, 2);
				},
				fail
			).then(done, done);
		},

		'should abort if method throws': function(done) {
			createContext({
				test: {
					literal: {
						ready: function() { throw sentinel; }
					},
					ready: 'ready'
				}
			}).then(
				fail,
				function(e) {
					assert.same(e, sentinel);
				}
			).then(done, done);
		},

		'should allow returning a promise': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						ready: function() {
							return { then: function(f) { f(result = sentinel); } };
						}
					},
					ready: { ready: 1 }
				}
			}).then(
				function() {
					assert.equals(result, sentinel);
				},
				fail
			).then(done, done);
		},

		'should abort if method returns a rejected promise': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						ready: function() {
							return { then: function(f, r) { r(result = sentinel); } };
						}
					},
					ready: { ready: 1 }
				}
			}).then(
				fail,
				function() {
					assert.equals(result, sentinel);
				}
			).then(done, done);
		}
	},

	'destroy facet': {
		'should call method with arguments': function(done) {
			var result;
			createContext({
				test: {
					literal: {
						destroy: function(val) { result = val; }
					},
					destroy: { destroy: 1 }
				}
			}).then(
				function(context) {
					refute.equals(result, 1);
					return context.destroy();
				}
			).then(
				function() {
					assert.equals(result, 1);
				}
			).otherwise(fail).then(done, done);
		}
	}
});
})(
	require('buster'),
	require('../../../../lib/context')
);