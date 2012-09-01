(function (define) {
define(function () {

	/**
	 * Returns a function that has been "debounced", which means it has been
	 * tuned to ideally only execute once even if it is invoked several times
	 * in succession. Debouncing is similar in concept to throttling except
	 * that the function should only execute once: either at the beginning
	 * of the debouncing period or at the end.  The goal is to filter out
	 * noisy, repetitive invocations and only execute once.
	 *
	 * @param [options.immediate=false] {Boolean} truthy if the function
	 *   should execute at the beginning of the debouncing period.
	 * @param [options.limit=100] {Number} msec that determines the time
	 *   between noisy invocations. Invocations occurring within this many
	 *   msec of a previous invocation are ignored.
	 * @param func {Function}
	 * @returns {Function} a debounced function
	 *
	 * @description a 100 msec limit (the default) is good for detecting
	 * when the user is finished with most user input events, as well as
	 * window resize or scroll events.  If you plan to use debouncing to
	 * prevent a user from re-submitting a form (by double-clicking on a
	 * button, for instance), set the immediate option to true so that your
	 * app responds immediately.
	 *
	 * Note: debounced functions can not return a value because they execute
	 * asynchronously (i.e. in a future turn).
	 */
	return function debounceFunction (options, func) {
		var limit, handle;

		// process arguments
		if (typeof options == 'function') {
			// shift arguments
			func = options;
			options = {};
		}
		if (!options) options = {};

		limit = isNaN(options.limit) ? 100 : options.limit;

		return options.immediate ? callAtStart : callAtEnd;

		function callAtEnd () {
			var self = this, args = arguments;
			clearTimeout(handle);
			handle = setTimeout(function () {
				func.apply(self, args);
			}, limit);
		}

		function callAtStart () {
			if (!handle) func.apply(this, arguments);
			clearTimeout(handle);
			handle = setTimeout(function () {
				handle = false;
			}, limit);
		}

	};

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));