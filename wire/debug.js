/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	Package: debug.js
	wire plugin that logs timing and debug information about wiring context and object
	lifecycle events (e.g. creation, properties set, initialized, etc.).
	
	Usage:
	{
		module: 'wire/debug',

		// verbose
		// If set to true, even more (a LOT) info will be output.
		// Default is false if not specified.
		verbose: false,

		// timeout
		// Milliseconds to wait for wiring to finish before reporting
		// failed components.  There may be failures caused by 3rd party
		// wire plugins and components that wire.js cannot detect.  This
		// provides a last ditch way to try to report those failures.
		// Default is 5000ms (5 seconds)
		timeout: 5000,

		// filter
		// String or RegExp to match against a component's name.  Only
		// components whose path matches will be reported in the debug
		// diagnostic output.
		// All components will still be tracked for failures.
		// This can be useful in reducing the amount of diagnostic output and
		// focusing it on specific components.
		// Defaults to matching all components
		// Examples:
		//   filter: ".*View"
		//   filter: /.*View/
		//   filter: "[fF]oo[bB]ar"
		filter: ".*"
	}
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

	function defaultFilter(path) {
		return !!path;
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
			var contextTimer, timeout, paths, logCreated, checkPathsTimeout, verbose, filter, filterRegex, plugin;

			verbose = options.verbose;

			if(options.filter) {
				filterRegex = options.filter.test ? options.filter : new RegExp(options.filter);
				filter = function(path) {
					return filterRegex.test(path);
				}
			} else {
				filter = defaultFilter;
			}

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
					var path = proxy.path;

					if (path) {
						paths[path].status = step;
					}

					if (verbose && filter(path)) {
						var message = time(step + ' ' + (path || proxy.id || ''), contextTimer);
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
					var path = proxy.path;

					if (path) {
						paths[path] = {
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