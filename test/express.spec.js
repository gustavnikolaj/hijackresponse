var http = require("http");
var expect = require("unexpected")
  .clone()
  .use(require("unexpected-express"))
  .addAssertion(
    "<object> to yield response <object|string>",
    (expect, subject, value) =>
      expect(subject, "to yield exchange", {
        request: "GET /",
        response: value
      })
  );
var path = require("path");
var stream = require("stream");
var express = require("express");
var hijackResponse = require("../lib/hijackResponse");

describe("Express Integration Tests", function() {
  it("simple case", function() {
    var app = express()
      .use(function(req, res, next) {
        hijackResponse(res, next).then(({ readable, writable }) => {
          const chunks = [];

          readable
            .on("data", chunk => chunks.push(chunk))
            .on("end", () => {
              const asUpperCase = Buffer.concat(chunks)
                .toString("utf-8")
                .toUpperCase();
              writable.write(Buffer.from(asUpperCase));
              writable.end();
            });
        });
      })
      .use(function(req, res, next) {
        res.setHeader("Content-Type", "text/plain");
        return res.end("foobar");
      });

    return expect(app, "to yield response", {
      statusCode: 200,
      body: "FOOBAR"
    });
  });

  it("simple case altering status code", function() {
    var app = express()
      .use(function(req, res, next) {
        hijackResponse(res, next).then(hijackedResponse => {
          const chunks = [];
          hijackedResponse.readable
            .on("data", chunk => chunks.push(chunk))
            .on("end", () => {
              res.status(201);
              const result = Buffer.concat(chunks)
                .toString("utf-8")
                .toUpperCase();
              hijackedResponse.writable.write(Buffer.from(result));
              hijackedResponse.writable.end();
            });
        });
      })
      .use(function(req, res, next) {
        res.setHeader("Content-Type", "text/plain");
        return res.end("foobar");
      });

    return expect(app, "to yield response", {
      statusCode: 201,
      body: "FOOBAR"
    });
  });

  describe("adapted from express-hijackresponse", function() {
    it("Create a test server that pipes the hijacked response into itself, then do a request against it (simple variant)", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, next).then(hijackedResponse => {
            hijackedResponse.readable.pipe(hijackedResponse.writable);
          });
        })
        .use(function(req, res, next) {
          res.send("foo");
        });

      return expect(app, "to yield response", "foo");
    });
    it("Create a test server that pipes the hijacked response into itself, then do a request against it (streaming variant)", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, next).then(hijackedResponse => {
            hijackedResponse.readable.pipe(hijackedResponse.writable);
          });
        })
        .use(function(req, res, next) {
          var num = 0;
          res.setHeader("Content-Type", "text/plain");
          function proceed() {
            if (num < 5) {
              res.write("foo");
              num += 1;
              process.nextTick(proceed);
            } else {
              res.end("bar");
            }
          }
          proceed();
        });

      return expect(app, "to yield response", "foofoofoofoofoobar");
    });
    it("Create a test server that pipes the original response through a buffered stream, then do a request against it (simple variant)", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, next).then(hijackedResponse => {
            var bufferedStream = new (require("bufferedstream"))();
            hijackedResponse.readable.pipe(bufferedStream);
            bufferedStream.pipe(hijackedResponse.writable);
          });
        })
        .use(function(req, res, next) {
          res.send("foo");
        });

      return expect(app, "to yield response", "foo");
    });
    it("Create a test server that pipes the original response through a buffered stream, then do a request against it (streaming variant)", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, next).then(hijackedResponse => {
            var bufferedStream = new (require("bufferedstream"))();
            hijackedResponse.readable.pipe(bufferedStream);
            bufferedStream.pipe(hijackedResponse.writable);
          });
        })
        .use(function(req, res, next) {
          res.contentType("text/plain");
          res.write("foo");
          res.end("bar");
        });

      return expect(app, "to yield response", "foobar");
    });
    it("Create a test server that hijacks the response and passes an error to next(), then run a request against it", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, next).then(hijackedResponse => {
            hijackedResponse.destroyAndRestore();
            next(new Error("Error!"));
          });
        })
        .use(function(req, res, next) {
          res.send("foo");
        })
        .use(require("errorhandler")({ log: false }));

      return expect(app, "to yield response", {
        statusCode: 500
      });
    });
    it("Create a test server that hijacks the response and immediately unhijacks it, then run a request against it", function() {
      // Immediately unhijacking is a reference to an old api where you had to
      // call an unhijack method to undo the patches to res. Now the way to
      // accomplish the same is just to pipe the readable and writeable streams
      // together.
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, next).then(hijackedResponse => {
            hijackedResponse.readable.pipe(hijackedResponse.writable);
          });
        })
        .use(function(req, res, next) {
          res.send("foo");
        });

      return expect(app, "to yield response", "foo");
    });
  });

  it("should work when hijacking a big response body and the compression middleware is present above the hijacking middleware", function() {
    return expect(
      express()
        .use(require("compression")())
        .use(function(req, res, next) {
          hijackResponse(res, next).then(({ readable, writable }) => {
            readable.pipe(writable);
          });
        })
        .use(express.static(path.resolve(__dirname, "fixtures"))),
      "to yield exchange",
      {
        request: "GET /bigfile.txt",
        response: { body: /^0{1999998}$/ }
      }
    );
  });

  it("should support multiple hijacking middlewares in the same chain", () => {
    const appendToStream = value =>
      new stream.Transform({
        transform(chunk, encoding, cb) {
          this.push(chunk);
          cb();
        },
        flush(cb) {
          this.push(Buffer.from(value));
          cb();
        }
      });

    return expect(
      express()
        .use(function(req, res, next) {
          hijackResponse(res, next).then(({ readable, writable }) => {
            readable.pipe(appendToStream("qux")).pipe(writable);
          });
        })
        .use(function(req, res, next) {
          hijackResponse(res, next).then(({ readable, writable }) => {
            readable.pipe(appendToStream("baz")).pipe(writable);
          });
        })
        .use((req, res, next) => {
          res.send("foobar");
        }),
      "to yield exchange",
      {
        request: "GET /",
        response: { body: "foobarbazqux" }
      }
    );
  });

  describe("against a real server", function() {
    function createServer(closeSpy) {
      return new Promise(function(resolve) {
        var app = express()
          .use((req, res, next) => {
            res.on("close", () => closeSpy());
            next();
          })
          .use(function(req, res, next) {
            hijackResponse(res, next).then(hijackedResponse => {
              hijackedResponse.readable.pipe(hijackedResponse.writable);
            });
          })
          .use(function(req, res) {
            res.write("foo");
          });

        const server = http.Server(app);

        server.listen(0, () => {
          resolve({
            port: server.address().port,
            close: () => server.close()
          });
        });
      });
    }

    it('should not prevent "close" events registered on res from firing when hijacking', async () => {
      let closeCallCount = 0;
      const closeSpy = () => {
        closeCallCount += 1;
      };
      const server = await createServer(closeSpy);

      try {
        await new Promise(function(resolve) {
          var request = http.request({ port: server.port }, res => {
            request.abort();
            setTimeout(() => resolve(), 10);
          });

          request.end();
        });

        expect({ closeCallCount }, "to satisfy", { closeCallCount: 1 });
      } finally {
        server.close();
      }
    });
  });

  describe("against a real proxied server", () => {
    function createApp() {
      return new Promise(resolve => {
        var app = express();

        app.use((req, res, next) => {
          res.status(200);
          res.set("Content-Type", "text/plain");
          res.set("X-Source", "yes!");
          res.end("foo");
        });

        const source = http.Server(app);

        source.listen(0, () => {
          resolve({
            port: source.address().port,
            close: () => source.close()
          });
        });
      });
    }

    function createProxy(sourcePort) {
      return new Promise(resolve => {
        const app = express();

        app.use((req, res, next) => {
          hijackResponse(res, next).then(hijackedResponse => {
            res.setHeader("X-Hijacked", "yes!");
            res.setHeader("transfer-encoding", "chunked");
            res.removeHeader("Content-Length");
            hijackedResponse.readable.pipe(hijackedResponse.writable);
          });
        });

        app.use(
          require("http-proxy-middleware")({
            target: "http://localhost:" + sourcePort,
            changeOrigin: true,
            logLevel: "silent"
          })
        );

        const proxy = http.Server(app);

        proxy.listen(0, () => {
          resolve({
            port: proxy.address().port,
            close: () => proxy.close()
          });
        });
      });
    }

    function makeRequest(proxyPort) {
      return new Promise(resolve => {
        require("http").get(
          {
            host: "localhost",
            port: proxyPort,
            path: "",
            agent: false
          },
          res => resolve(res)
        );
      });
    }

    it("should not mangle response message", async () => {
      const source = await createApp();
      const proxy = await createProxy(source.port);

      try {
        const res = await makeRequest(proxy.port);

        await expect(res.headers, "to exhaustively satisfy", {
          "x-powered-by": "Express",
          "content-type": /text\/plain/,
          "transfer-encoding": "chunked",
          date: expect.it("to be a string"),
          connection: "close",
          "x-source": "yes!",
          "x-hijacked": "yes!"
        });
      } finally {
        proxy.close();
        source.close();
      }
    });
  });
});
