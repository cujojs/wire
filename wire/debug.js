define([], function() {
	var timer = createTimer();

	function time(text) {
		return "DEBUG: " + text + " (" + timer() + ")";
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
		wire$setters: [
			function(object, property, value) {
				console.log('Setting property: ', object, property, value);
			}
		],
		// Overall context lifecycle callbacks
		wire$onContextInit: function(modules, moduleNames) {
			console.log(time("Context init"), moduleNames, modules);
		},
		wire$onContextError: function(msg, data) {
			console.log(time("Context ERROR") + msg, data);
		},
		wire$onContextReady: function(context) {
			console.log(time("Context ready"), context);
		},
		// Individual object lifecycle callbacks
		// Don't time these
		wire$afterCreate: function(target, spec, resolver) {
			console.log('After create', target, spec, resolver.name);
		},
		wire$afterProperties: function(target, spec, resolver) {
			console.log('After properties', target, spec, resolver.name);
		},
		wire$afterInit: function(target, spec, resolver) {
			console.log('After init', target, spec, resolver.name);
		},
		// Init for this plugin
		wire$init: function() {
			console.log(time("All modules loaded"));
		}
	};
	
});