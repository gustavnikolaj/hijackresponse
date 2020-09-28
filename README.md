# hijackresponse

[![npm version](https://badge.fury.io/js/hijackresponse.svg)](https://www.npmjs.com/package/hijackresponse)
[![Build Status](https://travis-ci.org/gustavnikolaj/hijackresponse.svg)](https://travis-ci.org/gustavnikolaj/hijackresponse)
[![Coverage Status](https://coveralls.io/repos/gustavnikolaj/hijackresponse/badge.svg?branch=master&service=github)](https://coveralls.io/github/gustavnikolaj/hijackresponse?branch=master)
[![Dependency Status](https://david-dm.org/gustavnikolaj/hijackresponse.svg)](https://david-dm.org/gustavnikolaj/hijackresponse)

Module that allows you to rewrite HTTP responses from middleware further down
the stack, such as static providers, HTTP proxies etc.

Requires node v8 or later.

This module is the spiritual successor to
[express-hijackresponse](https://github.com/papandreou/express-hijackresponse)
attempting to solve the same goals. The differences from the original module are
primarily that the API is slightly different, there's no direct coupling to
express and it supports streams2.

It's mostly useful for content filters. The original use case is injecting an
inline JavaScript into all HTML responses in
[LiveStyle](https://github.com/One-com/livestyle). It is also used in a series
of transpiler and preprocessing middleware:

- [express-compiless](https://github.com/papandreou/express-compiless)
- [express-processimage](https://github.com/papandreou/express-processimage)
- [express-extractheaders](https://github.com/papandreou/express-extractheaders)
- [express-autoprefixer](https://github.com/gustavnikolaj/express-autoprefixer)

## Installation

```
$ npm install hijackresponse
```

## Usage

```js
var express = require("express");
var hijackResponse = require("hijackresponse");

var app = express();

app.use((req, res, next) => {
  hijackResponse(res, next).then(({ readable, writable }) => {
    // Don't hijack HTML responses:
    if (/^text\/html/.test(res.getHeader("Content-Type"))) {
      return readable.pipe(writable);
    }

    res.setHeader("X-Hijacked", "yes!");
    res.removeHeader("Content-Length");

    readable.pipe(transformStream).pipe(writable);
  });
});
```

## API

### Function `hijackResponse()`

```
hijackResponse(res[, cb]) => Promise<HijackedReponse>
```

The `hijackResponse` function takes one required argument - the response object
which is the target of the hijacking. The second optional argument, is a
callback to be called when the hijacking preparations are done; this will mostly
be used when you are working with express. You can also decide to call the
callback afterwards if you prefer. The following two examples are equivalent:

```js
app.use((req, res, next) => {
  hijackResponse(res, next).then(() => { /* ... */});
});

app.use((req, res, next) => {
  hijackResponse(res).then(() => { /* ... */});
  next();
});
```

The first example is easier to work with when you are working with async/await:

```js
// Using express-promise-router or equivalent

app.use(async (req, res, next) => {
  const hijackedResponse = await hijackResponse(res, next);

  // ... do something with the hijacked reponse.
})
```

### Object `hijackedResponse`

```
{
  readable: NodeJS ReadableStream,
  writable: NodeJS Writable,
  destroyAndRestore: Function
}
```

The resolution value of the Promise returned from calling `hijackResponse`.

- `readable` is a readable stream containing the captured response body.
- `writable` is a writable stream which will be sent to the client.
- `destroyAndRestore` is a function that destroys the readable stream, and
  restores the original res.

Everything written to `res` in other handlers are captured, so if you want to
delegate to the express errorhandler you need to call `destroyAndRestore` before
doing so. Calling `destroyAndRestore` will undo the hijack, and destroy the `readable`
stream, meaning that all data written to it so far is discarded.

```js
app.use((req, res, next) => {
  hijackResponse(res, next).then((hijackedResponse) => {
    hijackedResponse.destroyAndRestore();
    return next(new Error('Something bad happened'));
  });
});
```

If you don't call `destroyAndRestore` before passing the error to next, the
errorhandlers output will become available on the `readable`-stream instead of
being sent to the client as intended.

## License

This module is published under the ISC License. See the `LICENCE` file for
additional details.
