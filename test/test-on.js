define('fixture', function() {
	function Fixture() {
		this.handled = 0;
	}

	Fixture.prototype = {
		handle: function(e) {
			this.handled++;
			this.selectorTarget = e.selectorTarget;
		},

		emit: function() {}
	};

	return Fixture;
});

function fail(dohd) {
	return function(e) {
		console.error(e);
		dohd.errback(e);
	}
}

require(['wire'], function(wire) {
	doh.register(pluginName, [
		function shouldAllowLongFormWithoutSelector(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: {
					create: 'fixture',
					on: {
						button: { click: 'handle' }
					}
				},
				button: { $ref: 'dom!test' },
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' }
				]
			}).then(
				function(context) {
					document.getElementById('test').click();
					dohd.callback(context.a.handled === 1);
				},
				fail(dohd)
			);

			return dohd;
		},
		function shouldAllowLongFormWithSelector(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: {
					create: 'fixture',
					on: {
						container: {
							'click:.test': 'handle'
						}
					}
				},
				container: { $ref: 'dom!container' },
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' }
				]
			}).then(
					function(context) {
						document.getElementById('test').click();
						dohd.callback(context.a.handled === 1);
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldAllowLongFormWithExplicitSelector(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: {
					create: 'fixture',
					on: {
						container: {
							selector: '.test',
							'click': 'handle'
						}
					}
				},
				container: { $ref: 'dom!container' },
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' }
				]
			}).then(
					function(context) {
						document.getElementById('test').click();
						dohd.callback(context.a.handled === 1);
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldAllowReverseConnectionsLongForm(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: { create: 'fixture' },
				button: {
					render: {
						template: '<button id="button1"></button>'
					},
					insert: { last: 'dom!container' },
					on: {
						click: { a: 'handle' }
					}
				},
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' },
					{ module: 'wire/dom/render' }
				]
			}).then(
					function(context) {
						document.getElementById('button1').click();
						dohd.callback(context.a.handled === 1);
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldAllowReverseConnectionsLongForm(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: { create: 'fixture' },
				buttonContainer: {
					render: {
						template: '<div><button id="button2" class="test"></button></div>'
					},
					insert: { last: 'dom!container' },
					on: {
						'click:.test': { a: 'handle' }
					}
				},
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' },
					{ module: 'wire/dom/render' }
				]
			}).then(
					function(context) {
						document.getElementById('button2').click();
						dohd.callback(context.a.handled === 1);
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldAllowReverseConnectionsShortForm(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: { create: 'fixture' },
				buttonContainer: {
					render: {
						template: '<div><button id="button3"></button></div>'
					},
					insert: { last: 'dom!container' },
					on: {
						click: 'a.handle'
					}
				},
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' },
					{ module: 'wire/dom/render' }
				]
			}).then(
					function(context) {
						document.getElementById('button3').click();
						dohd.callback(context.a.handled === 1);
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldAllowReverseConnectionsShortFormWithSelector(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: { create: 'fixture' },
				buttonContainer: {
					render: {
						template: '<div><button id="button4" class="test"></button></div>'
					},
					insert: { last: 'dom!container' },
					on: {
						'click:.test': 'a.handle'
					}
				},
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' },
					{ module: 'wire/dom/render' }
				]
			}).then(
					function(context) {
						document.getElementById('button4').click();
						dohd.callback(context.a.handled === 1);
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldSetEventSelectorPropertyIfSelector(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: { create: 'fixture' },
				buttonContainer: {
					render: {
						template: '<div><button id="button5" class="test"></button></div>'
					},
					insert: { last: 'dom!container' },
					on: {
						'click:.test': 'a.handle'
					}
				},
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' },
					{ module: 'wire/dom/render' }
				]
			}).then(
					function(context) {
						document.getElementById('button5').click();
						dohd.callback(context.a.selectorTarget.nodeName === 'BUTTON');
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldAllowMultipleEventTypes(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: { create: 'fixture' },
				buttonContainer: {
					render: {
						template: '<div><button id="button6" class="test"></button></div>'
					},
					insert: { last: 'dom!container' },
					on: {
						'click,mouseup,keypress:.test': 'a.handle'
					}
				},
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' },
					{ module: 'wire/dom/render' }
				]
			}).then(
					function(context) {
						document.getElementById('button6').click();
						dohd.callback(context.a.selectorTarget.nodeName === 'BUTTON');
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldAllowMultipleSelectors(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: { create: 'fixture' },
				buttonContainer: {
					render: {
						template: '<div><button id="buttonMultiSelector" class="test"></button></div>'
					},
					insert: { last: 'dom!container' },
					on: {
						'click,mouseup,keypress:.test,button': 'a.handle'
					}
				},
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' },
					{ module: 'wire/dom/render' }
				]
			}).then(
					function(context) {
						document.getElementById('buttonMultiSelector').click();
						dohd.callback(context.a.handled === 1);
					},
					fail(dohd)
			);

			return dohd;

		},
		function shouldNotSetEventSelectorPropertyIfNoSelector(doh) {
			var dohd = new doh.Deferred();

			wire({
				a: { create: 'fixture' },
				buttonContainer: {
					render: {
						template: '<div><button id="button7" class="test"></button></div>'
					},
					insert: { last: 'dom!container' },
					on: {
						'click': 'a.handle'
					}
				},
				plugins: [
					{ module: pluginName },
					{ module: 'wire/dom' },
					{ module: 'wire/dom/render' }
				]
			}).then(
					function(context) {
						document.getElementById('button7').click();
						dohd.callback(context.a.selectorTarget == void 0);
					},
					fail(dohd)
			);

			return dohd;

		}
	]);

	doh.run();
});