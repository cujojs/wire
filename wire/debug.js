/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	Package: debug.js
	wire plugin that logs timing and debug information about wiring context and object
	lifecycle events (e.g. creation, properties set, initialized, etc.).
*/
define([], function() {
	var timer, defaultTimeout;

	timer = createTimer();
	defaultTimeout = 5000; // 5 second wiring failure timeout
	
	/*
	 Function: time
	 Builds a string with timing info and a message for debug output

	 Params:
	 text - String message
	 contextTimer - per-context timer information

	 Returns:
	 A formatted string for output
	 */
	function time(text, contextTimer) {
		var all = timer(),
			timing = "(total: " +
				(contextTimer
					? all.total + "ms, context: " + contextTimer()
					: all)
				+ "): ";
		return "DEBUG " + timing + text;
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
			var now, total, splitTime;

			now = new Date().getTime();
			total = now - start;
			splitTime = now - split;
			split = now;

			return {
				total: total,
				split: splitTime,
				toString: function() {
					return '' + splitTime + 'ms / ' + total + 'ms';
				}
			};
		};
	}

	return {
		/*
		 Function: wire$plugin
		 Invoked when wiring starts and provides two promises: one for wiring the context,
		 and one for destroying the context.  Plugins should register resolve, reject, and
		 promise handlers as necessary to do their work.

		 Parameters:
		 ready - promise that will be resolved when the context has been wired, rejected
		 if there is an error during the wiring process, and will receive progress
		 events for object creation, property setting, and initialization.
		 destroy - promise that will be resolved when the context has been destroyed,
		 rejected if there is an error while destroying the context, and will
		 receive progress events for objects being destroyed.
		 */
		wire$plugin: function debugPlugin(ready, destroyed, options) {
			var contextTimer, timeout, paths, logCreated, checkPathsTimeout, verbose, plugin;

			verbose = options.verbose;
			contextTimer = createTimer();

			function contextTime(msg) {
				return time(msg, contextTimer);
			}

			console.log(contextTime("Context init"));

			ready.then(
				function onContextReady(context) {
					cancelPathsTimeout();
					console.log(contextTime("Context ready"), context);
				},
				function onContextError(err) {
					cancelPathsTimeout();
					console.error(contextTime("Context ERROR: "), err);
					console.error(err);
				}
			);

			destroyed.then(
				function onContextDestroyed() {
					console.log(contextTime("Context destroyed"));
				},
				function onContextDestroyError(err) {
					console.error(contextTime("Context destroy ERROR"), err);
				}
			);

			function makeListener(step, verbose) {
				return function(promise, proxy /*, wire */) {
					if (proxy.path) {
						paths[proxy.path].status = step;
					}

					if (verbose) {
						var message = time(step + ' ' + (proxy.path || proxy.id || ''), contextTimer);
						if (proxy.target) {
							console.log(message, proxy.target, proxy.spec);
						} else {
							console.log(message, proxy);
						}
					}

					promise.resolve();
				}
			}

			paths = {};
			timeout = options.timeout || defaultTimeout;
			logCreated = makeListener('created', verbose);

			function cancelPathsTimeout() {
				clearTimeout(checkPathsTimeout);
				checkPathsTimeout = null;
			}

			function checkPaths() {
				if (!checkPathsTimeout) return;

				var p, path;

				for (p in paths) {
					path = paths[p];
					if (path.status !== 'ready') {
						console.error("WIRING FAILED at " + path.status, p, path.spec);
					}
				}
			}

			checkPathsTimeout = setTimeout(checkPaths, timeout);

			plugin = {
				create: function(promise, proxy) {
					if (proxy.path) {
						paths[proxy.path] = {
							spec: proxy.spec
						};
					}
					logCreated(promise, proxy);
				},
				configure:  makeListener('configured', verbose),
				initialize: makeListener('initialized', verbose),
				ready:      makeListener('ready', true),
				destroy:    makeListener('destroyed', true)
			};

			return plugin;
		}
	};

});