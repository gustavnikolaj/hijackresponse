var Transform = require("stream").Transform;

module.exports = function hijackResponse(res, cb, name) {
  var implicitHeaderCalled = false;
  function callImplicitHeaderOnce() {
    if (!implicitHeaderCalled) {
      res._implicitHeader();
      implicitHeaderCalled = true;
    }
  }

  const __beforePatching = {
    write: res.write,
    end: res.end,
    on: res.on,
    writeHead: res.writeHead
  };

  const hijackedResponseBody = new Transform({
    transform(chunk, encoding, callback) {
      // Almost a PassThrough Stream. We just need to be able to set a boolean
      // and call a function when the first chunk is being processed.
      callImplicitHeaderOnce();
      callback(null, chunk, encoding);
    },
    flush(cb) {
      callImplicitHeaderOnce();
      cb(null);
    }
  });

  const proxyRes = {};
  Object.setPrototypeOf(proxyRes, res);

  for (const [methodName, method] of Object.entries(__beforePatching)) {
    proxyRes[methodName] = function() {
      method.apply(res, arguments);
    };
    proxyRes[methodName].name = `proxied-${methodName}-${name}`;
  }

  res.on = function hijackOn(eventName, ...args) {
    return hijackedResponseBody.on(eventName, ...args);
  };

  res.write = function hijackWrite(rawChunk, encoding) {
    if (rawChunk === null) {
      return hijackedResponseBody.end();
    }

    return hijackedResponseBody.write(rawChunk, encoding);
  };

  res.end = function(chunk, encoding) {
    hijackedResponseBody.end(chunk, encoding);
  };

  res.writeHead = function hijackWriteHead(statusCode, statusMessage, headers) {
    if (typeof headers === "undefined" && typeof statusMessage === "object") {
      headers = statusMessage;
      statusMessage = undefined;
    }
    if (statusCode) {
      res.statusCode = statusCode;
    }
    if (headers) {
      for (var headerName in headers) {
        res.setHeader(headerName, headers[headerName]);
      }
    }
    res.writeHead = __beforePatching.writeHead;
    cb(null, hijackedResponseBody, proxyRes);
  };
};
