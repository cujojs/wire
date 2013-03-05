/**
 * trackInflightRefs
 * @author: brian@hovercraftstudios.com
 */
(function(define) {
define(function(require) {

	var timeout, findStronglyConnected, formatCycles, refCycleCheckTimeout;

	timeout = require('when/timeout');
	findStronglyConnected = require('./tarjan');
	formatCycles = require('./formatCycles');

	refCycleCheckTimeout = 5000;

	/**
	 * Add this reference to the reference graph, and setup a timeout that will fire if the refPromise
	 * has not resolved in a reasonable amount.  If the timeout fires, check the current graph for cycles
	 * and fail wiring if we find any.
	 * @param {object} refPromise promise for reference resolution
	 * @param {DirectedGraph} refGraph graph to use to track cycles
	 * @param {string} refName reference being resolved
	 * @param {string} onBehalfOf some indication of another component on whose behalf this
	 *  reference is being resolved.  Used to build a reference graph and detect cycles
	 * @return {object} promise equivalent to refPromise but that may be rejected if cycles are detected
	 */
	return function trackInflightRef(refGraph, refPromise, refName, onBehalfOf) {

		refGraph.addEdge(onBehalfOf||'?', refName);

		return timeout(refPromise, refCycleCheckTimeout).then(
			function(resolved) {
				refGraph.removeEdge(onBehalfOf||'?', refName);
				return resolved;
			},
			function() {
				var stronglyConnected, cycles;

				stronglyConnected = findStronglyConnected(refGraph);
				cycles = stronglyConnected.filter(function(node) {
					return node.length > 1;
				});

				if(cycles.length) {
					// Cycles detected
					throw new Error('Possible circular refs:\n'
						+ formatCycles(cycles));
				}

				return refPromise;
			}
		);
	}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));
