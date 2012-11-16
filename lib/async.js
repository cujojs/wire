/**
 * Methods for dealing with async/promises not provided directly by when.js
 * @author: brian@hovercraftstudios.com
 */
(function(define) {
define(function(require) {

	var array, when, undef;

	array = require('./array');
	when = require('when');

	return {
		sequence: sequence
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
