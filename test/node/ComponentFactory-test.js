var buster, assert, refute, fail, ComponentFactory, sentinel, fulfilled;

buster = require('buster');
assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

ComponentFactory = require('../../lib/ComponentFactory');

sentinel = {};

fulfilled = {
	then: function(onFulfilled) {
		onFulfilled();
	}
};

buster.testCase('lib/ComponentFactory', {

	'createInstance': {
		'should call factory': function(done) {
			var cf, factory, options;

			cf = new ComponentFactory({}, {
				modulesReady: fulfilled,
				pluginApi: { contextualize: this.stub().returns({}) }
			});

			cf.addInstance = this.spy(function(instance) {
				return instance;
			});

			factory = this.spy(function(resolver) {
				resolver.resolve(sentinel);
			});
			options = {};
			cf.getFactory = this.stub().returns({ factory: factory, options: options });

			cf.createInstance({}).then(
				function(instance) {
					assert.same(instance, sentinel);
				}
			).then(done, done);
		}
	},

	'getFactory': {
		'should get factory': function() {
			var cf = new ComponentFactory({}, {
				plugins: {
					factories: { test: sentinel }
				}
			});

			assert.same(cf.getFactory({ test: {} }).factory, sentinel);
		},

		'should return falsey when factory not found': function() {
			var cf = new ComponentFactory({}, {
				plugins: {
					factories: {}
				}
			});

			refute(cf.getFactory({ test: {} }));
		},

		'should get factory and options': function() {
			var cf, found, spec;

			cf = new ComponentFactory({}, { plugins: { factories: { test: sentinel }}});
			spec = { test: 1 };
			found = cf.getFactory(spec);

			assert.same(found.factory, sentinel);
			assert.same(found.options.spec, spec);
			assert.equals(found.options.options, 1);
		}
	}

});
