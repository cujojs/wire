(function(buster, PluginRegistry) {
"use strict";

var assert, refute, sentinel;

assert = buster.assert;
refute = buster.refute;

sentinel = {};

buster.testCase('lib/plugin/registry', {
	'scanModule': {
		'should recognize legacy wire$plugin format': function(done) {
			var registry, plugin;

			plugin = {
				wire$plugin: this.spy()
			};

			registry = new PluginRegistry({});
			registry.scanModule(plugin, sentinel).then(
				function() {
					assert.calledOnceWith(plugin.wire$plugin, sentinel);
				}
			).then(done, done);
		},

		'should recognize a function as a plugin factory': function(done) {
			var registry, pluginFactory;

			pluginFactory = this.spy();

			registry = new PluginRegistry({});
			registry.scanModule(pluginFactory, sentinel).then(
				function() {
					assert.calledOnceWith(pluginFactory, sentinel);
				}
			).then(done, done);
		}

	},

	'proxiers': {
		'should be sorted by priority': function() {
			var registry, plugin1, plugin2;

			proxy1.priority = 1;
			function proxy1() {}

			proxy2.priority = -1;
			function proxy2() {}

			registry = new PluginRegistry({});
			plugin1 = {
				proxies: [proxy1]
			};

			plugin2 = {
				proxies: [proxy2]
			};

			registry.registerPlugin(plugin1);
			registry.registerPlugin(plugin2);

			assert.same(registry.proxiers[0], proxy2);
			assert.same(registry.proxiers[1], proxy1);
		}
	}
});
})(
	require('buster'),
	require('../../../../lib/plugin/registry')
);