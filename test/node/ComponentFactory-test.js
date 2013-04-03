var buster, assert, refute, fail, ComponentFactory, sentinel;

buster = require('buster');
assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

ComponentFactory = require('../../lib/ComponentFactory');

sentinel = {};

buster.testCase('lib/ComponentFactory', {

	"create": {
		'should call factory': function(done) {
			var cf, factory, options;

			cf = new ComponentFactory({}, {}, { contextualize: this.stub().returns({}) });

			cf.processComponent = this.spy(function(component, instance) {
				return instance;
			});

			factory = this.spy(function(resolver) {
				resolver.resolve(sentinel);
			});
			options = {};
			cf.getFactory = this.stub().returns({ factory: factory, options: options });

			cf.create({}).then(
				function(instance) {
					assert.same(instance, sentinel);
				}
			).then(done, done);
		}
	},

	'getFactory': {
		'should get factory': function() {
			var cf = new ComponentFactory({}, { factories: { test: sentinel } });

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

			cf = new ComponentFactory({}, { factories: { test: sentinel }});
			spec = { test: 1 };
			found = cf.getFactory(spec);

			assert.same(found.factory, sentinel);
			assert.same(found.options.spec, spec);
			assert.equals(found.options.options, 1);
		}
	}

});
