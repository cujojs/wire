(function(define){define(function(require){
(function(buster, PluginRegistry) {
"use strict";

var assert, refute, sentinel;

assert = buster.assert;
refute = buster.refute;

sentinel = {};

buster.testCase('lib/plugin/registry', {
	'scanModule': {
		'should recognize legacy wire$plugin format': function() {
			var registry, plugin;

			plugin = {
				wire$plugin: this.spy()
			};

			registry = new PluginRegistry({});
			return registry.scanModule(plugin, sentinel).then(
				function() {
					assert.calledOnceWith(plugin.wire$plugin, sentinel);
				}
			);
		},

		'should recognize a function as a plugin factory': function() {
			var registry, pluginFactory;

			pluginFactory = this.spy();

			registry = new PluginRegistry({});
			return registry.scanModule(pluginFactory, sentinel).then(
				function() {
					assert.calledOnceWith(pluginFactory, sentinel);
				}
			);
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
});})(typeof define !== 'undefined' ? define : function(fac){module.exports = fac(require);});
