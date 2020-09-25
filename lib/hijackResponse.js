const Transform = require("stream").Transform;
const BrokenPromise = require("./BrokenPromise");

const isHijackedPropertyName = "__HIJACKRESPONSE_IS_HIJACKED";

/**
 * Hijack a ServerResponse object, calling you when the headers would otherwise
 * have been sent, and returning you a readable stream, containing what the
 * others thought they wrote to the ServerResponse object, and a writeable
 * stream which will allow you to write to the actual ServerResponse object.
 *
 * @param {import("http").ServerResponse} res A Node.js ServerResponse object
 * @param {Function=} cb A callback - e.g. next when using express.js
 * @return {Promise<{ readable: NodeJS.ReadableStream, writable: NodeJS.WritableStream, destroyAndRestore: Function}>}
 */
module.exports = function hijackResponse(res, cb) {
  const brokenPromise = new BrokenPromise();

  if (res[isHijackedPropertyName]) {
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

  const hijackedResponse = {
    readable: hijackedResponseBody,
    writable: new Proxy(res, {
      get(target, prop) {
        // Make it detectable that we are dealing with a hijacked ServerResponse
        // and not a normal one. Used to prevent attempted hijacks of
        // hijackedResponse.writable.
        if (prop === isHijackedPropertyName) {
          return true;
        }

        // Allow access to the original methods from res, before we monkey
        // patched them.
        if (prop in __beforePatching) {
          return __beforePatching[prop].bind(target);
        }

        // Fallback to the value from res.
        return Reflect.get(...arguments);
      }
    }),
    destroyAndRestore() {
      // Restore res, in order to, for example, allow the express errorhandler
      // to use res. (passing errors to next won't work otherwise).
      for (const [methodName, method] of Object.entries(__beforePatching)) {
        res[methodName] = method;
      }
      return hijackedResponseBody.destroy();
    }
  };

  res.on = hijackedResponseBody.on.bind(hijackedResponseBody);
  res.write = hijackedResponseBody.write.bind(hijackedResponseBody);
  res.end = hijackedResponseBody.end.bind(hijackedResponseBody);

  // res.writeHead needs to do a little more than the other monkey-patched
  // methods, which are just forwarding the calls to our stream. writeHead is a
  // method from lib/_http_server.js  in node core.
  //
  // We have to patch the args onto res, as the original writeHead would do,
  // but then not actually write the headers, instead passing control over to
  // the hijacker by resolving the promise that we handed them out.
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

    brokenPromise.resolve(hijackedResponse);
  };

  // Call the callback, if we were passed any. This is likely going to be the
  // next function from an express middleware if provided.
  if (typeof cb === "function") {
    setImmediate(cb);
  }

  return brokenPromise;
};
