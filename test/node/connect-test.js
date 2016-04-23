(function(define){define(function(require){
(function(buster, context, connectPlugin, when) {
'use strict';

var assert, refute, fail, sentinel, other, obj1, obj2;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

sentinel = { value: 'sentinel' };
other = { value: 'other' };

obj1 = { method: function() {} };
obj2 = { method: function() {} };

function createContext(spec) {
	return context(spec, { require: require });
}

buster.testCase('connect', {
	'short form': {
		'should connect outgoing': function() {
			var receiver = this.stub({ method: function() {} });

			return createContext({
				plugins: [connectPlugin],
				sender: {
					literal: { method: function() {} },
					connect: { method: 'receiver.method' }
				},
				receiver: {
					literal: receiver
				}
			}).then(function(context) {
				context.sender.method(sentinel);
				assert.calledOnceWith(receiver.method, sentinel);
			});
		},

		'should connect incoming': function() {
			var receiver = this.stub({ method: function() {} });

			return createContext({
				plugins: [connectPlugin],
				sender: {
					literal: { method: function() {} }
				},
				receiver: {
					literal: receiver,
					connect: { 'sender.method': 'method' }
				},
			}).then(function(context) {
				context.sender.method(sentinel);
				assert.calledOnceWith(receiver.method, sentinel);
			});
		},

		'should transform outgoing': function() {
			var receiver = this.stub({ method: function() {} });

			return createContext({
				plugins: [connectPlugin],
				sender: {
					literal: { method: function() {} },
					connect: { method: 'tx | receiver.method' }
				},
				tx: {
					literal: function() { return sentinel; }
				},
				receiver: {
					literal: receiver
				}
			}).then(function(context) {
				context.sender.method(other);
				assert.calledOnceWith(receiver.method, sentinel);
			});
		},

		'should transform incoming': function() {
			var receiver = this.stub({ method: function() {} });

			return createContext({
				plugins: [connectPlugin],
				sender: {
					literal: { method: function() {} }
				},
				tx: {
					literal: function() { return sentinel; }
				},
				receiver: {
					literal: receiver,
					connect: { 'sender.method': 'tx | method' }
				}
			}).then(function(context) {
				context.sender.method(other);
				assert.calledOnceWith(receiver.method, sentinel);
			});
		}
	},

	'long form': {
		'should connect outgoing': function() {
			var receiver = this.stub({ method: function() {} });

			return createContext({
				plugins: [connectPlugin],
				sender: {
					literal: { method: function() {} },
					connect: { method: { receiver: 'method' } }
				},
				receiver: {
					literal: receiver
				}
			}).then(function(context) {
				context.sender.method(sentinel);
				assert.calledOnceWith(receiver.method, sentinel);
			});
		},

		'should connect incoming': function() {
			var receiver = this.stub({ method: function() {} });

			return createContext({
				plugins: [connectPlugin],
				sender: {
					literal: { method: function() {} }
				},
				receiver: {
					literal: receiver,
					connect: { sender: { method: 'method' } }
				}
			}).then(function(context) {
				context.sender.method(sentinel);
				assert.calledOnceWith(receiver.method, sentinel);
			});
		},

		'should transform outgoing': function() {
			var receiver = this.stub({ method: function() {} });

			return createContext({
				plugins: [connectPlugin],
				sender: {
					literal: { method: function() {} },
					connect: { method: { receiver: 'tx | method' } }
				},
				tx: {
					literal: function() { return sentinel; }
				},
				receiver: {
					literal: receiver
				}
			}).then(function(context) {
				context.sender.method(other);
				assert.calledOnceWith(receiver.method, sentinel);
			});
		},

		'should transform incoming': function() {
			var receiver = this.stub({ method: function() {} });

			return createContext({
				plugins: [connectPlugin],
				sender: {
					literal: { method: function() {} }
				},
				tx: {
					literal: function() { return sentinel; }
				},
				receiver: {
					literal: receiver,
					connect: { sender: { method: 'tx | method' } }
				}
			}).then(function(context) {
				context.sender.method(other);
				assert.calledOnceWith(receiver.method, sentinel);
			});
		}
	}
});
})(
	require('buster'),
	require('../../lib/context'),
	require('../../connect'),
	require('when')
);
});})(typeof define !== 'undefined' ? define : function(fac){module.exports = fac(require);});
