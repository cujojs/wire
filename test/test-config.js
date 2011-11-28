(function(global, undef) {

	function noop() {}

    // Fake console if we need to
   	if (typeof global.console === undef) {
   		global.console = { log: noop, error: noop };
   	}

	var doc, head, scripts, script, i, baseUrl, baseUrlSuffix,
		selfName, selfRegex, loaders, loader, loaderName, loaderPath, loaderConfig;

    // TODO: Parameterize loader to allow testing w/curl, requirejs, etc.
    loaderName = 'curl';

    // Try to get loader name from location hash
    try {
        loaderName = (global.location.hash).slice(1) || loaderName;
    } catch(e) {
    }

    console.log('USING LOADER: ' + loaderName);

	selfName = 'test-config.js';
	selfRegex = new RegExp(selfName + '$');

	baseUrlSuffix = '../';

    loaders = {
        curl: {
            script: 'test/curl/src/curl',
            packagePathOption: 'path',
            mixin: {
                apiName: 'require',
                pluginPath: 'curl/plugin'
            }
        },
        requirejs: {
            script: 'test/requirejs/require',
            packagePathOption: 'location',
            mixin: {
                paths: {
                    wire: 'wire',
                    domReady: 'test/requirejs/domReady'
                }
            }
        }
    };
    
    function addPackage(pkgInfo) {
        var cfg, pkg;
        
        if(!loaderConfig.packages) loaderConfig.packages = [];
        
        cfg = loaderConfig.packages;
        pkg = {
            name: pkgInfo.name,
            lib: pkgInfo.lib || '.',
            main: pkgInfo.main || pkgInfo.name
        };
        pkg[loader.packagePathOption] = pkgInfo.path;

        cfg.push(pkg);
    }

    loader = loaders[loaderName];
    
	loaderPath = loader.script;

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

	// dojo configuration, in case we need it
	global.djConfig = {
		baseUrl: baseUrl
	};

	// Setup loader config
	global[loaderName] = loaderConfig = {
		baseUrl: baseUrl,
		paths: {}
	};
    
    for(var m in loader.mixin) {
        loaderConfig[m] = loader.mixin[m];
    }

    addPackage({ name: 'dojo', path: 'dojo', main: './lib/main-browser' });
    addPackage({ name: 'dijit', path: 'dijit', main: './lib/main' });
    addPackage({ name: 'sizzle', path: 'support/sizzle' });
    addPackage({ name: 'aop', path: 'support/aop' });
    addPackage({ name: 'when', path: 'support/when' });
    addPackage({ name: 'wire', path: '.', lib: './wire' });

	// Other loaders may not need this
	loaderConfig.paths[loaderName] = loaderPath;

	// That's right y'all, document.write FTW
	doc.write('<script src="' + baseUrl + loaderPath + '.js' + '"></script>');

})(window);