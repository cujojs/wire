/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */
define({
	wire$resolvers: {
		'dom': function(factory, name, refObj, promise) {
			factory.domReady.then(function() {
				var result = document.getElementById(name[0] === '#' ? name.slice(1) : name);
				if(result) {
					promise.resolve(result);
				} else {
					promise.unresolved();
				}
			});
		}
	}
});