var buster, assert, refute, fail, builder, forEach;

buster = require('buster');
assert = buster.assert;
refute = buster.refute;
fail = buster.assertions.fail;

parser = require('../../../../builder/cram/parser');

forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

buster.testCase('wire/builder/cram/parser', {
    'should write a named define': function(done) {
        var spec, test;
        test = "test"
        spec ="{\n\ra: { test: 'a' }\n\r}";
        assert.equals(parser.injectIds(specObjectToModule(spec), test, []), specObjectToModuleWithIds(spec, test));
    },
    'should write a named define even with a one line comment': function(done) {
        var spec, test, result;
        test = "test"
        spec = "{\n\r";
        result = "{\n\r";
        spec += "//This is my comment\n\r";
        spec += "a: { test: 'a' }}";
        result += "a: { test: 'a' }}";
        assert.equals(parser.injectIds(specObjectToModule(spec), test, []).replace(/(\n|\r)/g,''), specObjectToModuleWithIds(result, test).replace(/(\n|\r)/g,''));
    },
    'should write a named define even with a comment at the end of an existing line': function(done) {
        var spec, test, result;
        test = "test"
        spec = "{\n\r";
        result = "{\n\r";
        spec += "a: { test: 'a' }//This is my comment\n\r}";
        result += "a: { test: 'a' }}";
        assert.equals(parser.injectIds(specObjectToModule(spec), test, []).replace(/(\n|\r)/g,''), specObjectToModuleWithIds(result, test).replace(/(\n|\r)/g,''));
    },
    'should write a named define even with a comment at the end of the first line': function(done) {
        var spec, test, result;
        test = "test"
        spec = "{//This is my comment\n\r";
        result = "{\n\r";
        spec += "a: { test: 'a' }}";
        result += "a: { test: 'a' }}";
        assert.equals(parser.injectIds(specObjectToModule(spec), test, []).replace(/(\n|\r)/g,''), specObjectToModuleWithIds(result, test).replace(/(\n|\r)/g,''));
    },
    'should write a named define even with a comment inbetween': function(done) {
        var spec, test, result;
        test = "test"
        spec = "/*This is my comment*/ {\n\r";
        result = "{\n\r";
        spec += "a: { test: 'a' }}";
        result += "a: { test: 'a' }}";
        assert.equals(parser.injectIds(specObjectToModule(spec), test, []).replace(/(\n|\r)/g,''), specObjectToModuleWithIds(result, test).replace(/(\n|\r)/g,''));
    },
    'should write a named define even if one value contains a comment like but is not a comment': function(done) {
        var spec, test, result;
        test = "test"
        spec = "/*Comment to be removed*/ {\n\r";
        result = "{\n\r";
        spec += "a: { test: 'http://example.com' }\n\r}";
        result += "a: { test: 'http://example.com' }\n\r}";
        assert.equals(parser.injectIds(specObjectToModule(spec), test, []).replace(/(\n|\r)/g,''), specObjectToModuleWithIds(result, test).replace(/(\n|\r)/g,''));
    }
});

function specObjectToModule(spec) {
    return 'define(' + spec + ');';
}
function specObjectToModuleWithIds(spec, id) {
    return 'define("' + id + '", ' + spec + ');';
}
