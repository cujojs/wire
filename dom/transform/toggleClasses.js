(function (define) {
define(function (require) {

	var createReplaceClasses, partial;

	createReplaceClasses = require('./replaceClasses');
	partial = require('../../lib/functional').partial;

	return function (options) {
		var args, toggle, removes, replaceClasses;

		replaceClasses = createReplaceClasses({ remover: classRemover });
		removes = '';

		args = [];
		if (options.node) args.push(options.node);
		if (options.classes) args.push(options.classes);

		toggle = makePartial([toggleClasses].concat(args));
		toggle.add = makePartial([addClasses].concat(args));
		toggle.remove = makePartial([removeClasses].concat(args));

		return toggle;

		function toggleClasses (node, classes) {
			// toggle is basically (a ^ b) where a == node's classes and b == toggled classes
			var fake, adds;
			// get everything that shouldn't be removed (adds)
			fake = { className: classes };
			removeClasses(fake, node.className);
			adds = fake.className;
			// remove toggled classes and put back adds
			removes = classes;
			replaceClasses(node, adds);
			return node;
		}

		function addClasses (node, classes) {
			return doReplaceClasses(node, classes);
		}

		function removeClasses (node, classes) {
			return doReplaceClasses(node, classes, '');
		}

		function doReplaceClasses(node, classes, replacement) {
			// Since we're allowing either the node, or the classes, or both(!)
			// to be pre-bound, have to check the arguments here and swap
			// if necessary.
			if(typeof node == 'string') {
				removes = node;
				node = classes;
				classes = removes;
			} else {
				removes = classes;
			}

			replaceClasses(node, arguments.length > 2 ? replacement : classes);
			return node;
		}

		function classRemover (classes, remover) {
			remover.setRemoves(removes);
			return remover(classes);
		}

	};

	function makePartial(args) {
		return partial.apply(null, args);
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(require); }
));