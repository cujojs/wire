(function(global, undef) {

	function noop() {}

	var doc, head, scripts, script, i, baseUrl, baseUrlSuffix,
		selfName, selfRegex;
	
	selfName = 'test-config.js';
	selfRegex = new RegExp(selfName + '$');

	baseUrlSuffix = '../';

	doc = global.document;
	head = doc.head || doc.getElementsByTagName('head')[0];

	i = 0;
	scripts = head.getElementsByTagName('script');
	while((script = scripts[i++]) && !baseUrl) {
		if(selfRegex.test(script.src)) {
			baseUrl = script.src.replace(selfName, '') + baseUrlSuffix;
		}
	}

	// Fake console if we need to
	if (typeof global.console === undef) {
		global.console = { log: noop, error: noop };
	}

	// dojo configuration, in case we need it
	global.djConfig = {
		baseUrl: baseUrl
	};

	global.require = global.curl = {
		apiName: 'require',
		baseUrl: baseUrl,
		paths: { curl: 'curl/src/curl' },
		pluginPath: 'curl/plugin',
		packages: [
			{ name: 'dojo', path: 'dojo', lib: '.', main: './lib/main-browser' },
			{ name: 'dijit', path: 'dijit', lib: '.', main: './lib/main' },
			{ name: 'aop', path: 'support/aop', main: 'aop' },
			{ name: 'wire', path: '.', lib: './wire', main: 'wire' }
		]
	};

})(window);