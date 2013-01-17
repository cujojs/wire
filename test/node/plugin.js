(function(buster, delay, wire, pluginModule) {
"use strict";

var assert, refute, plugin, fail, sentinel;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

sentinel = {};

plugin = {
	ready: function(resolver, proxy) {
		proxy.target.success = true;
		resolver.resolve();
	}
};

buster.testCase('plugin', {
	tearDown: function() {
		// Remove the plugin
		// Since this is a cached plugin
		delete pluginModule.wire$plugin;
	},

	'sync-init': {
		setUp: function() {
			// Setup a plugin that will record lifecycle steps
			pluginModule.wire$plugin = function() {
				return plugin;
			};
		},

		'should initialize': function(done) {
			wire({
				plugin: { module: './test/node/fixtures/object' },
				fixture: { literal: {} }
			}).then(
				function(context) {
					assert(context.fixture.success);
				},
				fail
			).then(done, done);
		}

	},

	'async-init': {
		setUp: function() {
			// Setup a plugin that will record lifecycle steps
			pluginModule.wire$plugin = function() {
				return delay(plugin, 0);
			};
		},

		'should initialize': function(done) {
			wire({
				plugin: { module: './test/node/fixtures/object' },
				fixture: { literal: {} }
			}).then(
				function(context) {
					assert(context.fixture.success);
				},
				fail
			).then(done, done);
		}
	},

	'namespace': {
		setUp: function() {
			// Setup a plugin that will record lifecycle steps
			pluginModule.wire$plugin = function() {
				return {
					facets: {
						test: {
							ready: function(resolver, proxy) {
								proxy.target.success = true;
								resolver.resolve();
							}
						}
					}
				};
			};
		},

		'should be in global namespace when not specified': function(done) {
			wire({
				plugin: { module: './test/node/fixtures/object' },
				fixture: {
					literal: {},
					test: {}
				}
			}).then(
				function(context) {
					assert(context.fixture.success);
				},
				fail
			).then(done, done);
		},

		'should not be in global namespace when namespace provided': function(done) {
			wire({
				plugin: { module: './test/node/fixtures/object', ns: 'namespace' },
				fixture: {
					literal: {},
					test: {}
				}
			}).then(
				fail,
				function(e) {
					assert.defined(e);
				}
			).then(done, done);
		},

		'should be in provided namespace': function(done) {
			wire({
				plugin: { module: './test/node/fixtures/object', ns: 'namespace' },
				fixture: {
					literal: {},
					'namespace:test': {}
				}
			}).then(
				function(context) {
					assert(context.fixture.success);
				},
				fail
			).then(done, done);
		}
	}
});
})(
	require('buster'),
	require('when/delay'),
	require('../..'),
	require('./fixtures/object')
);