const Transform = require("stream").Transform;
const BrokenPromise = require("./BrokenPromise");

module.exports = function hijackResponse(res, cb) {
  const brokenPromise = new BrokenPromise();

  if (res.isHijackedRes) {
    const err = new Error("You cannot hijack a hijacked response.");
    brokenPromise.reject(err);
  }

  // Take a reference to the methods on res that we're going to monkey patch,
  // so we can access them later.
  const __beforePatching = {
    write: res.write,
    end: res.end,
    on: res.on,
    writeHead: res.writeHead
  };

  let implicitHeaderCalled = false;
  function callImplicitHeaderOnce() {
    if (!implicitHeaderCalled) {
      res._implicitHeader();
      implicitHeaderCalled = true;
    }
  }

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

  const proxyRes = new Proxy(res, {
    get(target, prop) {
      if (prop === "isHijackedRes") {
        return true;
      }
      if (prop in __beforePatching) {
        return __beforePatching[prop].bind(target);
      }
      return Reflect.get(...arguments);
    }
  });

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

    brokenPromise.resolve({
      readable: hijackedResponseBody,
      writable: proxyRes
    });
  };

  if (typeof cb === "function") {
    setImmediate(cb);
  }

  return brokenPromise;
};
