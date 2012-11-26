/**
 * Methods for dealing with async/promises not provided directly by when.js
 * @author: brian@hovercraftstudios.com
 */
(function(define) {
define(function(require) {

	var array, when, undef;

	array = require('./array');
	when = require('when');

	/**
	 * Special object to hold a Promise that should not be resolved, but
	 * rather should be passed through a promise chain *as the resolution value*
	 * @param val
	 */
	function ResolvedValue(val) {
		this.value = val;
	}

	return {
		/**
		 * Create a wrapped ResolvedValue
		 * @param it
		 * @return {ResolvedValue}
		 */
		wrapValue: function(it) {
			return new ResolvedValue(it);
		},

		/**
		 * If it is a PromiseKeeper, return it.value, otherwise return it.  See
		 * PromiseKeeper above for an explanation.
		 * @param it anything
		 */
		getValue: function(it) {
			return it instanceof ResolvedValue ? it.value : it;
		}
	};

	/**
	 * Run the supplied async tasks in sequence, with no overlap.
	 * @param tasks {Array} array of functions
	 * @return {Promise} promise that resolves when all tasks
	 * have completed
	 */
	function sequence(tasks) {
		var args = array.fromArguments(arguments, 1);
		return when.reduce(tasks, function(context, task) {
			return when(task.apply(context, args), function() {
				return context;
			});
		}, undef);
	}

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
