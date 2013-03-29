(function(buster, delay, wire, pluginModule, pluginModule2) {
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

function fakePlugin() {
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
}

buster.testCase('plugin', {
	'sync-init': {

		'should initialize': function(done) {
			function pluginFactory() {
				return plugin;
			}

			wire({
				plugins: [pluginFactory],
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
		'should initialize': function(done) {
			function pluginFactory() {
				return delay(plugin, 0);
			}

			wire({
				plugins: [pluginFactory],
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

		'should be in global namespace when not specified': function(done) {
			wire({
				plugins: [fakePlugin],
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
				plugins: { testNamespace: fakePlugin },
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
				plugins: { testNamespace: fakePlugin },
				fixture: {
					literal: {},
					'testNamespace:test': {}
				}
			}).then(
				function(context) {
					assert(context.fixture.success);
				},
				fail
			).then(done, done);
		},

		'should fail wiring if non-unique': function(done) {
			wire({
				plugins: [
					{ wire$plugin: fakePlugin, $ns: 'namespace' },
					{ wire$plugin: function() { return fakePlugin(); }, $ns: 'namespace' }
				]
			}).then(
				fail,
				function(e) {
					assert.defined(e);
				}
			).then(done, done);
		}
	}
});
})(
	require('buster'),
	require('when/delay'),
	require('../..'),
	require('./fixtures/object'),
	require('./fixtures/object2')
);