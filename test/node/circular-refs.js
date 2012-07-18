(function(buster, timeout, wire, plugin) {
"use strict";

var assert, refute, fail;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

buster.testCase('circular-refs', {
	setUp: function() {
		// Setup a plugin that will record lifecycle steps
		plugin.wire$plugin = function() {
			return {
				facets: {
					shouldResolve: {
						'connect:before': function(resolver, facet, wire) {
							wire.resolveRef(facet.options).then(resolver.resolve, resolver.reject);
						}
					},
					shouldNotResolve: {
						'initialize:after': function(resolver, facet, wire) {
							wire.resolveRef(facet.options).then(resolver.reject, resolver.resolve);
						}
					}
				}
			}
		};
	},

	tearDown: function() {
		// Remove the plugin
		// Since this is a cached plugin
		delete plugin.wire$plugin;
	},

	'should resolve circular deps after init has finished': function(done) {
		var promise = timeout(wire({
			component1: {
				module: './test/node/fixtures/object',
				shouldResolve: 'component2'
			},
			component2: {
				module: './test/node/fixtures/object',
				shouldResolve: 'component1'
			}
		}), 100);

		promise.then(
			function(context) {
				assert.defined(context.component1);
				assert.defined(context.component2);
			},
			fail
		).always(done);
	},

	'should not resolve circular deps before init has finished': function(done) {
		var clock, promise;

		clock = this.useFakeTimers();

		promise = wire({
			component1: {
				module: './test/node/fixtures/object',
				shouldNotResolve: 'component2'
			},
			component2: {
				module: './test/node/fixtures/object',
				shouldNotResolve: 'component1'
			}
		});

		// Force 5 clock advancement
		clock.tick(5000);

		promise.then(
			fail,
			function() {
				assert(true);
			}
		).always(function() {
			clock.restore();
			done();
		});
	}

});

})(
	require('buster'),
	require('when/timeout'),
	require('../..'),
	require('./fixtures/object')
);