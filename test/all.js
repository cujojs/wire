(function(g) {
	/*global doh:true*/

	var hash = '';
	try {
		hash = g.location.hash;
	} catch(e) {}

	doh.registerUrl('_fake', '../../_doh-fake.html' + hash);

	// AMD
	doh.registerUrl('amd/module', '../../amd/module.html' + hash);
	doh.registerUrl('amd/plugin', '../../amd/plugin.html' + hash);

	// wire/dom
	doh.registerUrl('dom-resolver', '../../dom.html' + hash);

	// wire/dom/render
	doh.registerUrl('dom-render', '../../dom-render.html' + hash);

	// wire/on
	doh.registerUrl('wire/on', '../../on.html' + hash);

	// wire/connect
	doh.registerUrl('wire/connect', '../../connect.html' + hash);

	// wire/sizzle
	doh.registerUrl('sizzle', '../../sizzle.html' + hash);

	// Dojo
//	doh.registerUrl('wire/dojo/dom', '../../dojo/dom.html' + hash);
//	doh.registerUrl('wire/dojo/dom-insert', '../../dojo/dom-insert.html' + hash);
	doh.registerUrl('wire/dojo/on', '../../dojo/on.html' + hash);
//	doh.registerUrl('wire/dojo/pubsub', '../../dojo/pubsub1.html' + hash);

	// jQuery
	doh.registerUrl('wire/jquery/dom', '../../jquery/dom.html' + hash);
	doh.registerUrl('wire/jquery/dom-insert', '../../jquery/dom-insert.html' + hash);
	doh.registerUrl('wire/jquery/on', '../../jquery/on.html' + hash);

	// Go
	doh.run();

})(this);
