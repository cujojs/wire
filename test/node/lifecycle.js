(function(buster, wire, plugin) {
"use strict";

var assert, refute, fail, steps;

assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

steps = ['create', 'configure', 'initialize', 'connect', 'ready', 'destroy'].reduce(
	function(lifecycle, step) {
		lifecycle.push(step + ':before');
		lifecycle.push(step);
		lifecycle.push(step + ':after');
		return lifecycle;
	}, []
);

buster.testCase('lifecycle', {

	tearDown: function() {
		delete plugin.wire$plugin;
	},

	'step order': {
		setUp: function() {

			// Setup a plugin that will record lifecycle steps
			plugin.wire$plugin = function() {
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
			};
		},

		'should be consistent': function(done) {
			wire({
				plugins: [{ module: './test/node/fixtures/object' }],
//					component: { module: './test/node/fixtures/object' },
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
			).then(done, done);
		}
	},

	'should fail when encountering unrecognized facets': function(done) {
		wire({
			component: {
				literal: {},
				foo: 123
			}
		}).then(
			function(x) {
				console.log(x);
			},
			function(e) {
				assert.match(e.toString(), 'foo');
			}
		).then(done, done);
	}

});
})(
	require('buster'),
	require('../..'),
	require('./fixtures/object')
);