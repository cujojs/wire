/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * cyclesTracker
 * @author: brian@hovercraftstudios.com
 * @author: younes.ouadi@gmail.com
 */
(function(define) {
define(function(require) {

	var findStronglyConnected, formatCycles;

	findStronglyConnected = require('./tarjan');
	formatCycles = require('./formatCycles');

	/**
	 * Make sure that the new name doesn't introduce a cycle.
	 * 
	 * @param {string} name the name being used.
	 * @param {string} onBehalfOf some indication of another name on whose behalf this
	 *  name is being used.  Used to build graph and detect cycles
	 * @return {string} the name being used.
	 */
	function ensureNoCycles(namesGraph, name, onBehalfOf) {
		var stronglyConnected, cycles;

		// add the name to the graph
		onBehalfOf = onBehalfOf||'?';
		namesGraph.addEdge(onBehalfOf, name);

		// compute cycles
		stronglyConnected = findStronglyConnected(namesGraph);
		cycles = stronglyConnected.filter(function(node) {
			// Only consider cycles that:
			// * have more than one node
			// * have one node and that node is not self-referenced
			return node.length > 1 || (node.length === 1 && Object.keys(node[0].edges).indexOf(node[0].name) !== -1);
		});

		// is there a cycle?
		if(cycles.length) {
			// Cycles detected
			throw new Error('Possible circular usage:\n' + formatCycles(cycles));
		}

		return name;
	}

	return {
		ensureNoCycles: ensureNoCycles
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
