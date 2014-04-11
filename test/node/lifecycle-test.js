(function(buster, wire, plugin) {
"use strict";

var assert, refute, fail, steps;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

steps = ['create', 'configure', 'initialize', 'connect', 'ready', 'destroy'].reduce(
	function(lifecycle, step) {
		lifecycle.push(step + ':before');
		lifecycle.push(step);
		lifecycle.push(step + ':after');
		return lifecycle;
	}, []
);

function lifecycleTrackerPlugin() {
	// Setup a plugin that will record lifecycle steps
	var instance, order;

	instance = {};
	order = 0;

	steps.forEach(function(step) {
		instance[step] = function(resolver, proxy) {
			if(!proxy.target.lifecycle) proxy.target.lifecycle = [];
			proxy.target.lifecycle.push(step);
			resolver.resolve();
		}
	});

	return instance;
}

buster.testCase('lifecycle', {

	'step order': {
		'should be consistent': function() {
			return wire({
				plugins: [lifecycleTrackerPlugin],
				fixture: { literal: {} }
			}).then(
				function(context) {
					var component = context.fixture;

					// Ensure that create thru ready happen in order, and that
					// destroy does not happen
					assert.equals(component.lifecycle, steps.slice(0, steps.length-3));

					// Ensure that destroy happens and is always last
					return context.destroy().then(
						function() {
							assert.equals(component.lifecycle, steps);
						},
						fail
					);
				},
				fail
			);
		}
	},

	'should fail when encountering unrecognized facets': function() {
		return wire({
			component: {
				literal: {},
				foo: 123
			}
		}).then(
			fail,
			function(e) {
				assert.match(e.toString(), 'foo');
			}
		);
	}

});
})(
	require('buster'),
	require('../..'),
	require('./fixtures/object')
);