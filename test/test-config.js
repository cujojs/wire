(function(global, undef) {

	function noop() {}

	var doc, head, scripts, script, i, baseUrl, baseUrlSuffix,
		selfName, selfRegex, loaderName, loaderPath, loaderConfig;
	
	selfName = 'test-config.js';
	selfRegex = new RegExp(selfName + '$');

	baseUrlSuffix = '../';

	// TODO: Parameterize loader to allow testing w/curl, requirejs, etc.
	loaderName = 'curl';
	loaderPath = 'test/curl/src/curl';

	doc = global.document;
	head = doc.head || doc.getElementsByTagName('head')[0];

	// Find self script tag, use it to construct baseUrl
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

	// Setup loader config
	global[loaderName] = loaderConfig = {
		apiName: 'require',
		baseUrl: baseUrl,
		paths: {},
		pluginPath: 'curl/plugin',
		packages: [
			{ name: 'dojo', path: 'dojo', lib: '.', main: './lib/main-browser' },
			{ name: 'dijit', path: 'dijit', lib: '.', main: './lib/main' },
			{ name: 'sizzle', path: 'support/sizzle', main: 'sizzle' },
			{ name: 'aop', path: 'support/aop', main: 'aop' },
			{ name: 'when', path: 'support/when', main: 'when' },
			{ name: 'wire', path: '.', lib: './wire', main: 'wire' }
		]
	};

	// Other loaders may not need this
	loaderConfig.paths[loaderName] = loaderPath;

	// That's right y'all, document.write FTW
	doc.write('<script src="' + baseUrl + loaderPath + '.js' + '"></script>');

})(window);