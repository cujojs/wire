var buster, assert, refute, fail, builder, forEach;

buster = require('buster');
assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

builder = require('../../../../builder/parser/plugin');

forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

buster.testCase('wire/builder/parser/plugin', {

	'should generate module with original content': function(done) {
		var spec, json;

		spec = {
			a: { test: 'a' }
		};

		json = JSON.stringify(spec);

		function req(ids, cb) {
			cb(spec);
		}

		builder.compile('wire', 'test', req, {
			read: function(_, cb) {
				cb(specObjectToModule(spec));
			},
			write: function(content) {
				refute.equals(content.indexOf(json), -1);
				done();
			},
			error: function (reason) {
				refute(true, reason);
			}
		});
	}

});

