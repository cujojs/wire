# Testing wire.js

Wire.js is using [buster](http://busterjs.org) for testing. You need to have [node.js](https://nodejs.org) installed to run tests of wire.js.

## Testing in node.js:

[Install wire.js](docs/get.md) and run in installation directory
```
$ npm install
$ npm test
```

## Testing in browser

[Install wire.js](docs/get.md) and run in installation directory

```
$ npm install
$ npm run-script start-test-server
```

Open http://localhost:1111 in your browser and click "Capture browser" button. Browser is now connected to test server
and will be used by it to run tests.

Run in wire.js installation directory (without closing browser and test server)
```
$ npm run-script browser-test
```
