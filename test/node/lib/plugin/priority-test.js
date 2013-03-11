(function(buster, priority) {
"use strict";

var assert, refute;

assert = buster.assert;
refute = buster.refute;

buster.testCase('lib/plugin/priority', {
	'sortReverse': {
		'should sort in ascending priority order': function() {
			var ascending = priority.sortReverse([
				{ priority: 0 },
				{ priority: 1 },
				{ priority: -1}
			]);

			assert.equals(ascending, [{ priority: -1 }, { priority: 0 }, { priority: 1}]);
		}
	}
});
})(
	require('buster'),
	require('../../../../lib/plugin/priority')
);