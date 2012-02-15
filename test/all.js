(function(g) {

    var hash = '';
    try {
        hash = g.location.hash;
    } catch(e) {}

    doh.registerUrl('_fake', '../../_fake-doh.html' + hash);

    // Core
    doh.registerUrl('basic-types1', '../../basic-types1.html' + hash);
    doh.registerUrl('nested1', '../../nested1.html' + hash);
    doh.registerUrl('nested2', '../../nested2.html' + hash);
    doh.registerUrl('create-constructor', '../../create-constructor.html' + hash);
    // create with raw constructors/functions
    doh.registerUrl('plain-constructors', '../../required-modules.html' + hash);
    // Non-amd environment limited support
    doh.registerUrl('non-amd', '../../non-amd.html' + hash);

    // wire resolver
    doh.registerUrl('wire-resolver', '../../wire-resolver1.html' + hash);
    doh.registerUrl('wire-factory', '../../wire-factory1.html' + hash);

    // Facets

    // Base
    doh.registerUrl('init-facet', '../../init.html' + hash);
    doh.registerUrl('destroy-facet', '../../destroy.html' + hash);

    // Factories

    // literal
    doh.registerUrl('literal-factory', '../../literal.html' + hash);

    // wire/dom
    doh.registerUrl('dom-resolver', '../../dom1.html' + hash);

    // wire/aop
    doh.registerUrl('decorate1', '../../wire/aop/decorate1.html' + hash);
    doh.registerUrl('introduce1', '../../wire/aop/introduce1.html' + hash);
    doh.registerUrl('aop-weaving', '../../wire/aop/weave1.html' + hash);

    // wire/sizzle
    doh.registerUrl('sizzle', '../../sizzle.html' + hash);

	// wire/dojo/
	doh.registerUrl('wire/dojo/pubsub', '../../dojo/pubsub1.html' + hash);

    // Go
    doh.run();

})(this);
