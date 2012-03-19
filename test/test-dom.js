require(['wire'], function(wire) {

	wire({
		plugins: [
//					{ module: 'wire/debug' },
			{ module: pluginName }
		],
		node1: { $ref: 'dom.all!#node1' },
		divs: { $ref: 'dom.all!.test' },
		div: { $ref: 'dom.all!.test', i: 0 },
		atNode: { $ref: 'dom.all!div', i: 0 },
		deep: { $ref: 'dom.all!p', at: { $ref: 'atNode' }, i: 0 },
		deep2: { $ref: 'dom.all!p', at: 'atNode', i: 0 },
		domFirst: { $ref: 'dom.first!.test' },
//				domFirstFirst: { $ref: 'dom.first!.test:first' },
//				domFirstDeep: { $ref: 'dom.first!div:first p' },
		domFirstAt: { $ref: 'dom.first!p', at: { $ref: 'atNode' } }
	}).then(
		function(context) {
			doh.register(pluginName, [
				function domAllReturnsAtLeastOne(doh) {
					// dom.all/query always returns an array, so test
					// against the first
					doh.assertEqual(1, context.node1.length);
					doh.assertEqual('node1', context.node1[0].id);
				},
				function domAllLength(doh) {
					doh.assertEqual(3, context.divs.length);
				},
				function domAllIndexZeroReturnsFirst(doh) {
					// Using the plugin's i option to extract a single
					// node
					doh.assertEqual('test one', context.div.className);
				},
//				function(doh) {
//					// Checking for :first advanced selector.
//					doh.assertEqual('DIV', context.first && context.first.tagName);
//				},
				function domAllAtWithRef(doh) {
					// Checking "at" option (root/context).
					doh.assertEqual('node1', context.deep && context.deep.id);
				},
				function domAllAtWithString(doh) {
					// Checking "at" option without $ref
					doh.assertEqual('node1', context.deep2 && context.deep2.id);
				},
				function domFirst(doh) {
					// basic dom.first!
					doh.assertEqual('test one', context.domFirst.className);
				},
//						function(doh) {
//							// ensure dom.first! works even when :first is already present
//							doh.assertEqual('test one', context.domFirstFirst.className);
//						},
//						function(doh) {
//							// ensure dom.first! works with "at"
//							doh.assertEqual('node1', context.domFirstDeep.id);
//						},
				function domFirstNoMatch(doh) {
					// should fail wiring when query fails
					var dohd = new doh.Deferred();

					wire({
						dom: { module: pluginName },
						node: { $ref: 'dom.first!.this-will-fail' }
					}).then(
						function(e) {
							dohd.errback(e);
						},
						function() {
							dohd.callback(true);
						}
					);

					return dohd;
				},
				function domAllOutOfBoundsHigh(doh) {
					// should fail wiring when query fails
					var dohd = new doh.Deferred();

					wire({
						dom: { module: pluginName },
						node: { $ref: 'dom.all!.test', i: 10 }
					}).then(
						function(e) {
							dohd.errback(e);
						},
						function() {
							dohd.callback(true);
						}
					);

					return dohd;
				},
				function domAllOutOfBoundsLow(doh) {
					// should fail wiring when query fails
					var dohd = new doh.Deferred();

					wire({
						dom: { module: pluginName },
						node: { $ref: 'dom.all!.test', i: -1 }
					}).then(
						function(e) {
							dohd.errback(e);
						},
						function() {
							dohd.callback(true);
						}
					);

					return dohd;
				},
				function domAllWithNonNumericIndex(doh) {
					// should fail wiring when query fails
					var dohd = new doh.Deferred();

					wire({
						dom: { module: pluginName },
						node: { $ref: 'dom.all!.test', i: 'foo' }
					}).then(
						function(e) {
							dohd.errback(e);
						},
						function() {
							dohd.callback(true);
						}
					);

					return dohd;
				},
				function domFirstWithIndex(doh) {
					// should fail wiring when query fails
					var dohd = new doh.Deferred();

					wire({
						dom: { module: pluginName },
						node: { $ref: 'dom.first!.test', i: 0 }
					}).then(
						function(e) {
							dohd.errback(e);
						},
						function() {
							dohd.callback(true);
						}
					);

					return dohd;
				},
				function pluginAt(doh) {
					// ensure the at option works at the plugin level
					var dohd = new doh.Deferred();

					wire({
						dom: { module: pluginName, at: 'dom.first!#at-tests .root' },
						node: { $ref: 'dom.first!.at-test' }
					}).then(
						function(context) {
							dohd.callback(context.node.className === 'at-test ok');
						},
						dohd.errback
					);

					return dohd;
				},
				function optionAtOverridespluginAt(doh) {
					// ensure the at option is overridable
					var dohd = new doh.Deferred();

					wire({
						dom: { module: pluginName, at: 'dom.first!#at-tests .root' },
						nodes: { $ref: 'dom.all!.test', at: 'dom.first!body' }
					}).then(
						function(context) {
							dohd.callback(context.nodes.length === 3);
						},
						function(e) {
							dohd.errback(e);
						}
					);

					return dohd;
				},
				function testAddRemoveClass(doh) {
					var dohd = new doh.Deferred();

					wire({
						plugins: [
//                            { module: 'wire/debug' },
							{ module: pluginName, classes: { init: 'init', ready: 'ready' } }
						],
						node: { $ref: 'dom!node1' }
					}).then(
						function(context) {
							var html;
							html = document.getElementsByTagName('html')[0];
							dohd.callback(html.className === 'ready' && ('node1' === context.node.id));
						},
						function(e) {
							dohd.errback(e);
						}
					);

					return dohd;
				},
				function unresolveableSelectorIsUnresolvable(doh) {
					var dohd = new doh.Deferred();

					wire({
						plugins: [
//                            { module: 'wire/debug' },
							{ module: pluginName }
						],
						node: { $ref: 'dom!node3' }
					}).then(
						function(context) {
							dohd.errback('node3 should not have been resolvable');
						},
						function(e) {
							dohd.callback(true);
						}
					);

					return dohd;
				}
			]);

			doh.run();
		},
		function(err) {
			console.log(err);
			console.log(err.stack);
		}
	);
});