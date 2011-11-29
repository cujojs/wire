/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/**
 * debug.js
 * wire plugin that logs timing and debug information about wiring context and object
 * lifecycle events (e.g. creation, properties set, initialized, etc.).
 *
 * Usage:
 * {
 *     module: 'wire/debug',
 *
 *     // verbose
 *     // If set to true, even more (a LOT) info will be output.
 *     // Default is false if not specified.
 *     verbose: false,
 *
 *     // timeout
 *     // Milliseconds to wait for wiring to finish before reporting
 *     // failed components.  There may be failures caused by 3rd party
 *     // wire plugins and components that wire.js cannot detect.  This
 *     // provides a last ditch way to try to report those failures.
 *     // Default is 5000ms (5 seconds)
 *     timeout: 5000,
 *
 *     // filter
 *     // String or RegExp to match against a component's name.  Only
 *     // components whose path matches will be reported in the debug
 *     // diagnostic output.
 *     // All components will still be tracked for failures.
 *     // This can be useful in reducing the amount of diagnostic output and
 *     // focusing it on specific components.
 *     // Defaults to matching all components
 *     // Examples:
 *     //   filter: ".*View"
 *     //   filter: /.*View/
 *     //   filter: "[fF]oo[bB]ar"
 *     filter: ".*"
 * }
 */
(function(global) {
define([], function() {
    var timer, defaultTimeout, console, logTrace;

    function noop() {}

    // Fake console to prevent IE breakage
    console = global['console'] || { log: noop, error: noop, trace: noop };

    // TODO: Consider using stacktrace.js
    // https://github.com/eriwen/javascript-stacktrace
    // For now, quick and dirty, based on how stacktrace.js chooses the appropriate field
    // If console.trace exists, use it, otherwise use console.error
    logTrace = typeof console.trace == 'function'
        ? function(e) { console.trace(e); }
        : function(e) { console.error(e.stack || e.stacktrace || e.message || e); };

    timer = createTimer();
    defaultTimeout = 5000; // 5 second wiring failure timeout

    /**
     * Builds a string with timing info and a message for debug output
     *
     * @param text {String} message
     * @param contextTimer per-context timer information
     *
     * @returns A formatted string for output
     */
    function time(text, contextTimer) {
        var all, timing;

        all = timer();
        timing = "(total: " +
                 (contextTimer
                     ? all.total + "ms, context: " + contextTimer()
                     : all)
            + "): ";

        return "DEBUG " + timing + text;
    }

    /**
     * Creates a timer function that, when called, returns an object containing
     * the total elapsed time since the timer was created, and the split time
     * since the last time the timer was called.  All times in milliseconds
     *
     * @returns timer
     */
    function createTimer() {
        var start = new Date().getTime(), split = start;

        /**
         * Returns the total elapsed time since this timer was created, and the
         * split time since this getTime was last called.
         *
         * @returns Object containing total and split times in milliseconds, plus a
         * toString() function that is useful in logging the time.
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
        wire$plugin: function debugPlugin(ready, destroyed, options) {
            var contextTimer, timeout, paths, logCreated, checkPathsTimeout, verbose, filter, filterRegex, plugin;

            verbose = options.verbose;

            if (options.filter) {
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
                        logTrace(err);
                    }
            );

            destroyed.then(
                    function onContextDestroyed() {
                        console.log(contextTime("Context destroyed"));
                    },
                    function onContextDestroyError(err) {
                        console.error(contextTime("Context destroy ERROR"), err);
                        logTrace(err);
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
})(this);
