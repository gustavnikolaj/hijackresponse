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
  hijackResponse(res, (hijackedResponseBody, res) => {
    // Don't hijack HTML responses:
    if (/^text\/html(?:;$)/.test(res.getHeader("Content-Type"))) {
      return hijackedResponseBody.pipe(res);
    }

    res.setHeader("X-Hijacked", "yes!");
    res.removeHeader("Content-Length");

    hijackedResponseBody.pipe(transformStream).pipe(res);
  });
  // next() must be called explicitly, even when hijacking the response:
  next();
});
```

## License

This module is published under the ISC License. See the `LICENCE` file for
additional details.
