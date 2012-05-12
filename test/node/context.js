(function(buster, createContext) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('context', {

	'initializers': {
		'should execute when context is created': function(done) {
			var executed = false;
			createContext({}, null, {
				require: require,
				initializers: [
					function() {
						executed = true;
					}
				]
			}).then(
				function() {
					assert(executed);
				}
			).then(done, done);
		}
	},

	'finalizers': {
		'should execute when context is created': function(done) {
			var executed = false;
			createContext({}, null, {
				require: require,
				finalizers: [
					function() {
						executed = true;
					}
				]
			}).then(
				function() {
					assert(executed);
				}
			).then(done, done);
		}
	},

	'destroyers': {
		'should execute when context is destroyed': function(done) {
			var executed = false;
			createContext({}, null, {
				require: require,
				destroyers: [
					function() {
						executed = true;
					}
				]
			}).then(
				function(context) {
					refute(executed);

					context.destroy().then(
						function() {
							assert(executed);
						}
					);
				}
			).then(done, done);
		}
	},

	'initializers, finalizers, and destroyers': {
		'should execute in correct order': function(done) {
			var initializers, finalizers, destroyers;
			createContext({}, null, {
				require: require,
				initializers: [
					function() {
						refute(initializers);
						refute(finalizers);
						refute(destroyers);
						initializers = true;
					}
				],
				finalizers: [
					function() {
						assert(initializers);
						refute(finalizers);
						refute(destroyers);
						finalizers = true;
					}
				],
				destroyers: [
					function() {
						assert(initializers);
						assert(finalizers);
						refute(destroyers);
						destroyers = true;
					}
				]
			}).then(
				function(context) {
					// Should not have executed yet
					refute(destroyers);

					return context.destroy().then(
						function() {
							assert(initializers);
							assert(finalizers);
							assert(destroyers);
						}
					);
				}
			).then(done, done);
		}
	}
});

})(
	require('buster'),
	require('../../lib/context')
);