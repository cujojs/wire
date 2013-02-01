/**
 * Methods for dealing with async/promises not provided directly by when.js
 * @author: brian@hovercraftstudios.com
 */
(function(define) { 'use strict';
define(function(require) {

	var array, when, cancelable, delay, undef;

	array = require('./array');
	when = require('when');
	cancelable = require('when/cancelable');
	delay = require('when/delay');

	/**
	 * Special object to hold a Promise that should not be resolved, but
	 * rather should be passed through a promise chain *as the resolution value*
	 * @param val
	 */
	function ResolvedValue(val) {
		this.value = val;
	}

	return {
		/**
		 * Create a wrapped ResolvedValue
		 * @param it
		 * @return {ResolvedValue}
		 */
		wrapValue: function(it) {
			return new ResolvedValue(it);
		},

		/**
		 * If it is a PromiseKeeper, return it.value, otherwise return it.  See
		 * PromiseKeeper above for an explanation.
		 * @param it anything
		 */
		getValue: function(it) {
			return it instanceof ResolvedValue ? it.value : it;
		},

		until: until
	};

	// TODO: Remove in favor of when/poll once it's released
	// Slightly simplified version of when/poll
	function until(work, interval, verifier) {
	
		var deferred = when.defer();

		verifier = verifier || function () { return false; };

		function schedule() {
			delay(interval).then(vote);
		}

		function vote() {
			when(work(),
				function (result) {
					when(verifier(result), handleNext, schedule);
				
					function handleNext(verification) {
						return verification ? deferred.resolve(result) : schedule();
					}
				},
				deferred.reject
			);
		}

		schedule();

		return deferred.promise;
	}

});
}(typeof define === 'function' ? define : function(factory) { module.exports = factory(require); }));
