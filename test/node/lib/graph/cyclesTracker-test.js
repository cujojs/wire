(function(buster, cyclesTracker, DirectedGraph) {
'use strict';

var assert, refute, fail, namesGraph;

assert = buster.assert;
refute = buster.refute;
fail = buster.fail;

function dumpDirectedGraph(directedGraph) {
	var result = '';
	directedGraph.eachVertex(function(v){
		result += '{ name: ' + v.name + ', edges: {';
		Object.keys(v.edges).forEach(function(e, i, a){
			result += (i === 0 ? '' : ', ') + e + ': ' + v.edges[e];
		});
		result += '}}';
	});

	return result;
}

buster.testCase('lib / graph / cyclesTracker', {
	' / normal usage': {
		'should allow any name to be used': function() {
			namesGraph = new DirectedGraph();

			var actual;

			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name1');
			assert.equals(actual, 'name1', dumpDirectedGraph(namesGraph));
		},
		'should allow many not connected names to be used': function() {
			namesGraph = new DirectedGraph();

			var actual;

			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name1');
			assert.equals(actual, 'name1', dumpDirectedGraph(namesGraph));

			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name2');
			assert.equals(actual, 'name2', dumpDirectedGraph(namesGraph));

			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name3');
			assert.equals(actual, 'name3', dumpDirectedGraph(namesGraph));

			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name4');
			assert.equals(actual, 'name4', dumpDirectedGraph(namesGraph));
		},
		'should allow one "open" route': function() {
			namesGraph = new DirectedGraph();

			var actual;

			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name1', 'name2');
			assert.equals(actual, 'name1', dumpDirectedGraph(namesGraph));
		},
		'should allow many "open" routes': function() {
			namesGraph = new DirectedGraph();

			var actual;

			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name1', 'name2');
			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name2', 'name3');
			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name2', 'name4');
			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name3', 'name5');
			actual = cyclesTracker.ensureNoCycles(namesGraph, 'name5', 'name6');

			assert.equals(actual, 'name5', dumpDirectedGraph(namesGraph));
		},
	},
	' / cycles detected': {
		'should not allow a name to reference itself': function() {
			namesGraph = new DirectedGraph();

			try {
				cyclesTracker.ensureNoCycles(namesGraph, 'name1', 'name1');
			} catch(e) {
				assert.equals(e.message.indexOf('Possible circular usage:\n'), 0, e.message);
				return;
			}
			assert(false, dumpDirectedGraph(namesGraph));
		},
		'should not allow two names to reference each other': function() {
			namesGraph = new DirectedGraph();

			try {
				cyclesTracker.ensureNoCycles(namesGraph, 'name1', 'name2');
				cyclesTracker.ensureNoCycles(namesGraph, 'name2', 'name1');
			} catch(e) {
				assert.equals(e.message.indexOf('Possible circular usage:\n'), 0, e.message);
				return;
			}
			assert(false, dumpDirectedGraph(namesGraph));
		},
		'should not allow cycle with three nodes': function() {
			namesGraph = new DirectedGraph();

			try {
				cyclesTracker.ensureNoCycles(namesGraph, 'name1', 'name2');
				cyclesTracker.ensureNoCycles(namesGraph, 'name2', 'name3');
				cyclesTracker.ensureNoCycles(namesGraph, 'name3', 'name1');
			} catch(e) {
				assert.equals(e.message.indexOf('Possible circular usage:\n'), 0, e.message);
				return;
			}
			assert(false, dumpDirectedGraph(namesGraph));
		},
	},
});

})(
	require('buster'),
	require('../../../../lib/graph/cyclesTracker'),
	require('../../../../lib/graph/DirectedGraph')
);