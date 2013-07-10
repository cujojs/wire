(function(buster, delay, wire) {
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

		'should initialize': function() {
			function pluginFactory() {
				return plugin;
			}

			return wire({
				plugins: [pluginFactory],
				fixture: { literal: {} }
			}).then(
				function(context) {
					assert(context.fixture.success);
				},
				fail
			);
		}

	},

	'async-init': {
		'should initialize': function() {
			function pluginFactory() {
				return delay(plugin, 0);
			}

			return wire({
				plugins: [pluginFactory],
				fixture: { literal: {} }
			}).then(
				function(context) {
					assert(context.fixture.success);
				},
				fail
			);
		}
	},

	'namespace': {

		'should be in global namespace when not specified': function() {
			return wire({
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
			);
		},

		'should not be in global namespace when namespace provided': function() {
			return wire({
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
			);
		},

		'should be in provided namespace': function() {
			return wire({
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
			);
		},

		'should fail wiring if non-unique': function() {
			return wire({
				plugins: [
					{ wire$plugin: fakePlugin, $ns: 'namespace' },
					{ wire$plugin: function() { return fakePlugin(); }, $ns: 'namespace' }
				]
			}).then(
				fail,
				function(e) {
					assert.defined(e);
				}
			);
		}
	}
});
})(
	require('buster'),
	require('when/delay'),
	require('../../wire')
);