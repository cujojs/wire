'use strict';
var fs = require('fs');

var glob = require('glob');
var busterAmd = require('buster-amd');

var conditionalLoadGenerator = require('./node-es6/conditional-load-generator');

require('gent/test-adapter/buster');

var tests = ['node/**/*.js'];
var nodeTests = tests.slice();
var es6Tests = glob.sync('node-es6/**/*-test.js');
var conditionalBrowserLoaders = [ 'node-es6/var/conditional-load.js'];

// begin node test setup

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

console.log('class operator %savailable in node', isClassAvailable() ? '' : 'not ');
console.log('spread operator %savailable in node', isSpreadAvailable() ? '' : 'not ');
if(
	isClassAvailable()
	&& isSpreadAvailable()
	&& !('ES_VERSION' in process.env && parseFloat(process.env.ES_VERSION) < 6)
) {
	nodeTests = nodeTests.concat(es6Tests);
}

module.exports['node'] = {
	environment: 'node',
	tests: tests.concat(nodeTests)
	// TODO: Why doesn't this work?
	//, testHelpers:['gent/test-adapter/buster']
};

// begin browser test setup

// hack, we have to detect if browser is es6 capable in browser itself
// and load es6 tests only when that is true
// but to load es6 tests in browser we have to have list of them after decision
// whether to load them is made. I found no other way to pass this list to browser
// than with static file
fs.writeFileSync(
	__dirname+'/node-es6/var/conditional-load.js',
	conditionalLoadGenerator(es6Tests.map(function(e){return 'test/'+e;}))
);


module.exports['browser'] = {
	environment: 'browser',
	rootPath: '../',
	libs: [
		'node_modules/requirejs/require.js',
		'test/requirejs-main.js',
	],
	sources:
		['lib/**/*.js', 'lib/*.js', 'node_modules/{gent,meld,when}/**/*.js', 'dom/**/*.js', '*.js']
		.concat(es6Tests.map(function(e){return 'test/'+e;})),
	tests: tests
		.concat(conditionalBrowserLoaders)
		.map(function(e){return 'test/'+e;}),
	extensions: [busterAmd]
};
