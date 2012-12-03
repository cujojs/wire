var buster, assert, refute, fail, builder, forEach;

buster = require('buster');
assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

builder = require('../../../builder/cram');

forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

buster.testCase('wire/builder/cram', {

	'should write a named define': function(done) {
		var spec = {};

		function req() {
			return spec;
		}

		builder.compile('wire!test', req, {
			read: function(_, cb) {
				cb(JSON.stringify(spec));
			},
			write: function(content) {
				assert(/^define\("test",[\s\S]+\);$/.test(content));
				done();
			}
		});
	},

	'should generate dependency list': function(done) {
		var spec, deps, names;

		spec = {};
		deps = [];
		names = 'abcdef';

		forEach(names, function(name) {
			spec[name] = { module: name };
			deps.push('"' + name + '"');
		});

		function req() {
			return spec;
		}

		builder.compile('wire!test', req, {
			read: function(_, cb) {
				cb(JSON.stringify(spec));
			},
			write: function(content) {
				var str = '[' + ['"wire"'].concat(deps).join(',') + ']';
				refute.equals(content.indexOf(str), -1);
				done();
			}
		});
	},

	'should generate module with original content': function(done) {
		var spec, json;

		spec = {
			a: { test: 'a' }
		};

		json = JSON.stringify(spec);

		function req() {
			return spec;
		}

		builder.compile('wire!test', req, {
			read: function(_, cb) {
				cb(json);
			},
			write: function(content) {
				refute.equals(content.indexOf(json), -1);
				done();
			}
		});
	},

	'with a comma-separated list of specs': {
		'should generate a define for each': function(done) {
			var specs = {
				atest: { a: { module: 'a' } },
				btest: { b: { module: 'b' } }
			};

			function req(moduleId) {
				return specs[moduleId];
			}

			builder.compile('wire!atest,btest', req, {
				read: function(path, cb) {
					cb(JSON.stringify(specs[path]));
				},
				write: function(content) {
					assert(/^define\("atest",[\s\S]+\);\s*define\("btest",[\s\S]+\);$/.test(content));
					done();
				}
			});
		},

		'should generate defines with original content for each': function(done) {
			var specs = {
				atest: { a: { module: 'a' } },
				btest: { b: { module: 'b' } }
			};

			function req(moduleId) {
				return specs[moduleId];
			}

			builder.compile('wire!atest,btest', req, {
				read: function(path, cb) {
					cb(JSON.stringify(specs[path]));
				},
				write: function(content) {
					refute.equals(content.indexOf(JSON.stringify(specs.atest)), -1);
					refute.equals(content.indexOf(JSON.stringify(specs.btest)), -1);
					done();
				}
			});
		}

	}
});