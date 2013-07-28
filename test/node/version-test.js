(function(buster) {
	"use strict";

	var assert, refute, fail, bowerJson, packageJson;

	assert = buster.assert;
	refute = buster.refute;
	fail = buster.assertions.fail;

	bowerJson = require('../../bower');
	packageJson = require('../../package');

	buster.testCase('wire/version', {
		'should have the same name for package.json and component.json': function () {
			assert.same(bowerJson.name, packageJson.name);
		},
		'should have the same version for package.json and component.json': function () {
			assert.same(bowerJson.version, packageJson.version);
		}
	});
}(require('buster')));
