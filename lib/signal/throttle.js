(function (define) {
define(function () {

	/**
	 * Returns a function that has been throttled, which means it executes
	 * no faster than a prescribed rate, not at a possibly faster rate at
	 * which its being invoked.  The throttled function will be executed
	 * at least once in response to at least one invocation.  If you want
	 * to ensure that your function is executed only once, take a look at
	 * debounce instad of throttle.
	 *
	 * @param [options.limit=100] {Number} msec that determines the minimum
	 *   time between actual function executions.
	 * @param func {Function}
	 * @returns {Function} a throttled function
	 *
	 * Note: throttled functions can not return a value because they execute
	 * asynchronously (i.e. in a future turn).
	 */
	return function throttleFunction (options, func) {
		var limit, suppress;

		// process arguments
		if (typeof options == 'function') {
			// shift arguments
			func = options;
			options = {};
		}
		if (!options) options = {};

		limit = isNaN(options.limit) ? 100 : options.limit;
		suppress = false;

		return function throttled () {
			var self = this, args = arguments;

			if (!suppress) {
				suppress = true;
				setTimeout(function () {
					suppress = false;
					func.apply(self, args);
				}, limit);
			}
		};

	};

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));