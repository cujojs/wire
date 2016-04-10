'use strict';

require('gent/test-adapter/buster');

function evaluates (statement) {
	try {
		/* jshint evil: true */
		eval(statement);
		/* jshint evil: false */
		return true;
	} catch (err) {
		return false;
	}
}

function isClassAvailable() {
	return evaluates('class es6TestClass_ibyechBaloodren7 {}');
}

function isSpreadAvailable() {
	return evaluates('parseInt(...["20", 10])');
}

var tests = ['node/**/*-test.js'];

console.log('class operator %savailable', isClassAvailable() ? '' : 'not ');
console.log('spread operator %savailable', isSpreadAvailable() ? '' : 'not ');

if(
	isClassAvailable()
	&& isSpreadAvailable()
	&& !('ES_VERSION' in process.env && parseFloat(process.env.ES_VERSION) < 6)
) {
	tests.push('node-es6/**/*-test.js');
}

module.exports['node'] = {
	environment: 'node',
	tests: tests
	// TODO: Why doesn't this work?
	//, testHelpers:['gent/test-adapter/buster']
};
