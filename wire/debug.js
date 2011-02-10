define([], function() {
	var timer = createTimer(),
		objectCount = 0;
	
	function msg(text) {
		return "DEBUG: " + text;
	}

	function time(text) {
		return msg(text) + " (" + timer() + ")";
	}

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
		// Init for this plugin
		wire$init: function() {
			console.log(time("All modules loaded"));
		},
		wire$onWire: function(ready, destroy) {
			console.log(time("Context init"));
			ready.then(
				function onContextReady(context) {
					console.log(time("Context ready"), context);
				},
				function onContextError(err) {
					console.log(time("Context ERROR: "), err);
				},
				function onContextProgress(progress) {
					// progress:
					//   target: Object - object whose status is being reported
					//   status: String - current status of object
					//   spec: Any - wiring spec
					console.log(msg('Object ' + progress.status), progress.target, progress.spec);
				}
			);
			
			destroy.then(
				function onContextDestroyed() {
					console.log(time("Context destroyed"));
				},
				function onContextDestroyError(err) {
					console.log(time("Context destroy ERROR"), err);
				},
				function onContextDestroyProgress(progress) {
					// progress:
					//   target: Object - object whose status is being reported
					//   status: String - current status of object
					//   spec: Any - wiring spec
					console.log(msg('Object ' + progress.status), progress.target, progress.spec);
				}
			);
		}
	};
	
});