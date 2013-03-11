(function(buster, PluginRegistry) {
"use strict";

var assert, refute;

assert = buster.assert;
refute = buster.refute;

buster.testCase('lib/plugin/registry', {
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