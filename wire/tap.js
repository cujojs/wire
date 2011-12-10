/**
 * @license Copyright (c) 2010-2011 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/**
 * tap.js
 */
(function() {
define(['aop', 'when'], function(aop, when) {
    var defaultInitStep, defaultPointcut;

    /** Default lifecycle step at which to begin tracing */
    defaultInitStep = 'initialize';

    /** Default pointcut query to match methods that will be traced */
    defaultPointcut = /./;

    function defaultFilter(path) {
        return !!path;
    }

    function createPathFilter(filter) {
        if (!filter) return defaultFilter;

        var rx = filter.test ? filter : new RegExp(filter);

        return function (path) {
            return rx.test(path);
        }

    }
    
    function ProfileAspect(path, handler) {
        this.path = path;
        this.handler = handler;
    }
    
    ProfileAspect.prototype = {
        around: function (joinpoint) {
            var result, data, start;

            data = {
                method: joinpoint.method,
                key: this.path + '.' + joinpoint.method,
                target: joinpoint.target,
                args: joinpoint.args
            };

            // Signal method enter
            try {
//                this.handler('enter', data);

                start = new Date().getTime();
                data.result = joinpoint.proceed();
                data.elapsed = (new Date()).getTime() - start;

                // return result
                return result;

            } catch (e) {
                data.elapsed = (new Date()).getTime() - start;

                // rethrow
                data.exception = result;
                throw e;

            } finally {
                this.handler(data);
                // Signal method exit
            }
        }        
    };

    /**
     *
     */
    function createCollector(options) {
        var add, destroy, traceFilter, tracePointcut, profileAspects;

        traceFilter = createPathFilter(options.filter);
        tracePointcut = options.pointcut || defaultPointcut;

        /**
         * Trace pointcut query function that filters out wire plugins
         * @param target {Object} target object to query for methods to advise
         */
        function pointcut(target) {
            var matches = [];

            for (var p in target) {
                // Only match functions, exclude wire plugins, and then apply
                // the supplied tracePointcut regexp
                if (typeof target[p] === 'function' && p !== 'wire$plugin' && tracePointcut.test(p)) {
                    matches.push(p);
                }
            }

            return matches;
        }

        profileAspects = [];
        add = function (path, target, aggregator) {
            var profileAspect, wrapper;

            if (traceFilter(path)) {
                profileAspect = new ProfileAspect(path, aggregator);
                wrapper = {
                    around: function (joinpoint) {
                        profileAspect.around(joinpoint);
                    }
                };
                // Create the aspect, if the path matched
                profileAspects.push(aop.add(target, pointcut, wrapper));
            }
            // trace intentionally does not resolve the promise
            // trace relies on the existing plugin method to resolve it
        };

        destroy = function () {
            for (var i = profileAspects.length; i >= 0; --i) {
                profileAspects[i].remove();
            }
        };

        return { add: add, destroy: destroy };
    }
    
    var getDefaultAggregator = (function() {
        var getInstance;
        
        getInstance = function() {
            var byKey, byMethod, aggregatedKeys, aggregatedMethods, newData;
            
            byKey = {};
            aggregatedKeys = [];

            byMethod = {};
            aggregatedMethods = [];

            newData = false;
            
            function add(map, array, key, data) {
                var item = map[key];
                if(!item) {
                    item = map[key] = {
                        key: key,
                        total: data.elapsed,
                        samples: 1
                    };
                    
                    array.push(item);
                } else {
                    item.total += data.elapsed;
                    ++item.samples;
                }
            }
            
            function aggregator(data) {
                add(byKey, aggregatedKeys, data.key, data);
                add(byMethod, aggregatedMethods, data.method, data);

                newData = true;
            }

            function dump(array) {
                var sorted, count, d;
                count = 50;

                array.sort(function(d1, d2) {
                    return d1.total === d2.total ? d1.samples - d2.samples : d1.total - d2.total;
                });

                sorted = array.slice(0, Math.min(count, array.length));

                for(var i=sorted.length-1; i >= 0; i--) {
                    d = sorted[i];
                    console.log(d.key, d.total.toFixed(0), d.samples, d.total/d.samples);
                }

            }
            
            setInterval(function() {
                if(!newData) return;

                console.log('-- PROFILE: Methods ----------------------------------------------------');
                dump(aggregatedMethods);

                console.log('-- PROFILE: Component Methods ------------------------------------------');
                dump(aggregatedKeys);

                console.log('-- PROFILE END ---------------------------------------------------------');

                newData = false;
            }, 5000);
            
            getInstance = function() {
                return aggregator;
            };
            
            return aggregator;
        };
        
        return function() {
            return getInstance();
        }
    })();
    
    return {
        wire$plugin: function debugPlugin(ready, destroyed, options) {
            var step, plugin, collector, aggregator;
            
            step = options.step || defaultInitStep;
            aggregator = options.aggregator;

            collector = createCollector(options);
            
            plugin = {};
            plugin[step] = function(resolver, proxy /*, wire */) {
                collector.add(proxy.path, proxy.target, aggregator || getDefaultAggregator());
                resolver.resolve();
            };
            
            when(destroyed, function() {
                collector.destroy();
            });
            
            return plugin;
        }
    };

});
})();
