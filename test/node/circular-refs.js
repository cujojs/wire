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
							resolver.resolve(wire.resolveRef(facet.options));
						}
					},
					shouldNotResolve: {
						'initialize:after': function(resolver, facet, wire) {
							console.log('initialize:after', facet.id);
							resolver.resolve(wire.resolveRef(facet.options));
						}
					}
				}
			};
		};
	},

	tearDown: function() {
		// Remove the plugin
		// Since this is a cached plugin
		delete plugin.wire$plugin;
	},

	'should resolve circular deps after init has finished': function(done) {
		var promise = timeout(wire({
			plugin: { module: './test/node/fixtures/object' },
			component1: {
				literal: {},
				shouldResolve: 'component2'
			},
			component2: {
				literal: {},
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
			plugin: { module: './test/node/fixtures/object' },
			component1: {
				literal: { name: '1' },
				shouldNotResolve: 'component2'
			},
			component2: {
				literal: { name: '2' },
				shouldNotResolve: 'component1'
			}
		});

		// Force clock advancement
		clock.tick(1e4);

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