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

		function req(ids, cb) {
			cb(spec);
		}

		builder.compile('wire', 'test', req, {
			read: function(_, cb) {
				cb(specObjectToModule(spec));
			},
			write: function(content) {
				assert(/^define\("test",[\s\S]+\);$/.test(content));
				done();
			},
			error: function (reason) {
				refute(true, reason);
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

		function req(ids, cb) {
			cb(spec);
		}

		builder.compile('wire', 'test', req, {
			read: function(_, cb) {
				cb('define(' + JSON.stringify(spec) +');');
			},
			write: function(content) {
				var str = '[' + ['"wire"'].concat(deps).join(', ') + ']';
				refute.equals(content.indexOf(str), -1);
				done();
			},
			error: function (reason) {
				refute(true, reason);
			}
		});
	},

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
	},

	'with a comma-separated list of specs': {
		'should generate a define for each': function(done) {
			var specs = {
				'atest.js': { a: { module: 'a' } },
				'btest.js': { b: { module: 'b' } }
			};

			function req(moduleId, cb) {
				cb(specs[moduleId]);
			}

			builder.compile('wire', 'atest,btest', req, {
				read: function(path, cb) {
					cb(specObjectToModule(specs[path]));
				},
				write: function(content) {
					assert(/^define\("atest",[\s\S]+\);\s*define\("btest",[\s\S]+\);$/.test(content));
					done();
				},
				error: function (reason) {
					refute(true, reason);
				}
			});
		},

		'should generate defines with original content for each': function(done) {
			var specs = {
				'atest.js': { a: { module: 'a' } },
				'btest.js': { b: { module: 'b' } }
			};

			function req(moduleId, cb) {
				cb(specs[moduleId]);
			}

			builder.compile('wire', 'atest,btest', req, {
				read: function(path, cb) {
					cb(specObjectToModule(specs[path]));
				},
				write: function(content) {
					refute.equals(content.indexOf(JSON.stringify(specs['atest.js'])), -1);
					refute.equals(content.indexOf(JSON.stringify(specs['btest.js'])), -1);
					done();
				},
				error: function (reason) {
					refute(true, reason);
				}
			});
		}

	}
});

function specObjectToModule (spec) {
	return 'define(' + JSON.stringify(spec) + ');'
}