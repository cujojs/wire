require('gent/test-adapter/buster');

module.exports['node'] = {
	environment: 'node',
	tests: ['node/**/*-test.js']
	// TODO: Why doesn't this work?
	//, testHelpers:['gent/test-adapter/buster']
};