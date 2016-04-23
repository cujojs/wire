(function(){
	'use strict';
	require.config({
		packages: [
			{ name: 'gent', location: 'node_modules/gent', main: 'gent' },
			{ name: 'meld', location: 'node_modules/meld', main: 'meld' },
			{ name: 'when', location: 'node_modules/when', main: 'when' },
		]
	});
})()
