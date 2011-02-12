/**
 * @license Copyright (c) 2010 Brian Cavalier
 * LICENSE: see the LICENSE.txt file. If file is missing, this file is subject
 * to the MIT License at: http://www.opensource.org/licenses/mit-license.php.
 */

/*
	File: base.js
	Base wire plugin that provides a reference resolver to resolve objects by name,
	and a setter plugin that sets basic Javascript properties, e.g. object.prop = value.
*/
define([], function() {
	var undef;
	
	return {
		wire$resolvers: {
			/*
				Function: $
				Base resolver to resolve references by name.  This is the resolver
				that is used when no other resolver plugin is specified with a reference.
				For example: { $ref: "myObject" }
				
				Parameters:
					factory - context factory that is performing wiring
					name - String name of the reference to be resolved, e.g. "name"
					refObj - the complete JSON reference Object, e.g. { $ref: "name" }
					promise - promise to resolve with the resolved reference value.
						promise.unresolve() must be called if this resolver cannot
						resolve the reference.
			*/
			$: function defaultResolver(factory, name, refObj, promise) {
				var resolved = factory.resolveName(name);
				
				if(resolved !== undef) {
					promise.resolve(resolved);
				} else {
					factory.objectReady(name).then(function() {
						promise.resolve(factory.resolveName(name));
					});
				}
			}
		},
		wire$setters: [
			/*
				Function: set
				Basic setter that sets simple Javascript properties.  This is the
				fallback setter that is used if no other setters can handle setting
				properties for a particular object.
				
				Parameters:
					object - Object on which to set property
					property - String name of property to set on object
					value - value to which to set property
					
				Returns:
				Always returns true.  In general, though, setters should return true if they
				have successfully set the property, or false (strict false, not falsey)
				if they cannot set the property on the object.
			*/
			function set(object, property, value) {
				object[property] = value;
				return true;
			}
		]
	};
});