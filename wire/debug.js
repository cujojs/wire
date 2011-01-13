define([], function() {
	var timer = createTimer();
	
	function msg(text) {
		return "DEBUG: " + text;
	}

	function time(text) {
		return msg(text) + " (" + timer() + ")";
	}

	console.log(time("Debug plugin loaded"));
	
	/*
		Function: createTimer
		Creates a timer function that, when called, returns an object containing
		the total elapsed time since the timer was created, and the split time
		since the last time the timer was called.  All times in milliseconds

		Returns:
			Timer function
	*/
	function createTimer() {
		var start = new Date().getTime(),
			split = start;

		/*
			Function: getTime
			Returns the total elapsed time since this timer was created, and the
			split time since this getTime was last called.

			Returns:
				Object containing total and split times in milliseconds, plus a
				toString() function that is useful in logging the time.
		*/
		return function getTime() {
			var now = new Date().getTime(),
				total = now - start,
				splitTime = now - split;
			split = now;

			return {
				total: total,
				split: splitTime,
				toString: function() {
					return 'total: ' + total + 'ms, split: ' + splitTime + 'ms';
				}
			};
		};
	}
	
	return {
		wire$listeners: {
			// Overall context lifecycle callbacks
			onContextInit: function(modules) {
				console.log(time("Context init"), modules);
			},
			onContextError: function(context, msg, data) {
				console.log(time("Context ERROR: "), msg, data);
			},
			onContextReady: function(context) {
				console.log(time("Context ready"), context);
			},
			onContextDestroy: function(context) {
				console.log(time("Context destroy"), context);
			},
			// Individual object lifecycle callbacks
			// Don't time these
			onCreate: function(target, spec, resolver) {
				console.log(msg('created'), target, spec);
			},
			onProperties: function(target, spec, resolver) {
				console.log(msg('properties'), target, spec);
			},
			onInit: function(target, spec, resolver) {
				console.log(msg('init'), target, spec);
			},
			onDestroy: function(target) {
				console.log(msg('destroy'), target);
			}
		},
		// Init for this plugin
		wire$init: function() {
			console.log(time("All modules loaded"));
		}
	};
	
});