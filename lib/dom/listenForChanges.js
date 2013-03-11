(function (define) {
define(function () {

	return listenForChanges;

	function listenForChanges (on, node, listener) {
		var callback, unlisteners;

		callback = debounce(listener);

		// listen for events that could signal that a value has changed:
		// blur and/or focusout as well as click and change
		unlisteners = [
			on(node, 'blur', callback, true), // capture blur (Firefox)
			on(node, 'focusout', callback), // capture blur (IE, webkit)
			on(node, 'click', callback), // radios and checkboxes in IE
			on(node, 'change', callback)
		]; // other inputs

		// return unlistener
		return createUnlistener(unlisteners);
	}

	function debounce (func) {
		var timeout;
		return function () {
			var that = this, args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(function () {
				func.apply(that, args);
			}, 0);
		};
	}

	function createUnlistener (list) {
		return function unlisten () {
			list.forEach(function (func) { func(); });
		}
	}

});
}(
	typeof define == 'function' && define.amd
		? define
		: function (factory) { module.exports = factory(); }
));