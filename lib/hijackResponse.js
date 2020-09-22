const Transform = require("stream").Transform;

module.exports = function hijackResponse(res, cb, name) {
  let implicitHeaderCalled = false;
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

  hijackedResponseBody.destroyAndRestore = function destroyAndRestore() {
    for (const [methodName, method] of Object.entries(__beforePatching)) {
      res[methodName] = method;
    }
    return hijackedResponseBody.destroy();
  };

  const proxyRes = {
    get statusCode() {
      return res.statusCode;
    },
    set statusCode(value) {
      return (res.statusCode = value);
    },
    get statusMessage() {
      return res.statusMessage;
    },
    set statusMessage(value) {
      return (res.statusMessage = value);
    }
  };
  Object.setPrototypeOf(proxyRes, res);

  for (const [methodName, method] of Object.entries(__beforePatching)) {
    proxyRes[methodName] = (...args) => method.apply(res, args);
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

  res.end = function hijackEnd(chunk, encoding) {
    return hijackedResponseBody.end(chunk, encoding);
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
      for (const headerName in headers) {
        res.setHeader(headerName, headers[headerName]);
      }
    }
    res.writeHead = __beforePatching.writeHead;
    cb(hijackedResponseBody, proxyRes);
  };
};
