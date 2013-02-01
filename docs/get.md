# Getting wire.js

Wire.js requires an **AMD compatible loader** and an **ES5 environment** when running in a browser.  If you aren't already using an AMD loader and ES5 shim, we recommend [curl](#getting-curl) and [poly](#getting-poly).  Other AMD loaders, such as [RequireJS](http://requirejs.org), and ES5 shims, such as [es5-shim](https://github.com/kriskowal/es5-shim), should work as well.

## Yeoman/Bower

`yeoman install wire` *or* `bower install wire`

## Node

`npm install wire`

## RingoJS

1. `ringo-admin install cujojs/wire`
1. `ringo-admin install cujojs/when`
1. `ringo-admin install cujojs/meld`

## Clone

1. `git clone https://github.com/cujojs/wire`
1. `cd wire`
1. `git submodule init && git submodule update`
	* NOTE: poly is included as a submodule, so you won't need to download it separately if you install wire.js this way.

## Download

Download each of the following and arrange into your project:

1. [wire](https://github.com/cujojs/wire/tags)
1. [when](https://github.com/cujojs/when/tags) >= 1.5.0
1. [meld](https://github.com/cujojs/meld/tags) >= 1.0.0

# Other libraries

## Getting curl

To use curl as your AMD loader, wire.js 0.9.x requires [curl](https://github.com/cujojs/curl) 0.7.1 or higher, or 0.6.8.  You can [clone](https://github.com/cujojs/curl) or [download](https://github.com/cujojs/curl/tags) curl into your project, or install it via yeoman/bower:

`yeoman install curl` *or* `bower install curl`

## Getting poly

To support non-ES5 legacy browsers, wire.js requires [poly](https://github.com/cujojs/poly) 0.5.0 or higher.  You can [clone](https://github.com/cujojs/poly) or [download](https://github.com/cujojs/poly/tags) poly into your project, or install it via yeoman/bower:

`yeoman instal poly` *or* `bower install poly`