/* global describe, it, before, after */
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
var express = require("express");
var hijackResponse = require("../lib/hijackResponse");

describe("Express Integration Tests", function() {
  it("simple case", function() {
    var app = express()
      .use(function(req, res, next) {
        hijackResponse(res, function(hijackedResponseBody, res) {
          var chunks = [];
          hijackedResponseBody.on("data", function(chunk) {
            chunks.push(chunk);
          });
          hijackedResponseBody.on("end", function() {
            var result = Buffer.concat(chunks)
              .toString("utf-8")
              .toUpperCase();
            res.write(Buffer.from(result));
            res.end();
          });
        });
        next();
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
        hijackResponse(res, function(hijackedResponseBody, res) {
          var chunks = [];
          hijackedResponseBody.on("data", function(chunk) {
            chunks.push(chunk);
          });
          hijackedResponseBody.on("end", function() {
            res.status(201);
            var result = Buffer.concat(chunks)
              .toString("utf-8")
              .toUpperCase();
            res.write(Buffer.from(result));
            res.end();
          });
        });
        next();
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
          hijackResponse(res, function(hijackedResponseBody, res) {
            hijackedResponseBody.pipe(res);
          });
          next();
        })
        .use(function(req, res, next) {
          res.send("foo");
        });

      return expect(app, "to yield response", "foo");
    });
    it("Create a test server that pipes the hijacked response into itself, then do a request against it (streaming variant)", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, function(hijackedResponseBody, res) {
            hijackedResponseBody.pipe(res);
          });
          next();
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
          hijackResponse(res, function(hijackedResponseBody, res) {
            var bufferedStream = new (require("bufferedstream"))();
            hijackedResponseBody.pipe(bufferedStream);
            bufferedStream.pipe(res);
          });
          next();
        })
        .use(function(req, res, next) {
          res.send("foo");
        });

      return expect(app, "to yield response", "foo");
    });
    it("Create a test server that pipes the original response through a buffered stream, then do a request against it (streaming variant)", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, function(hijackedResponseBody, res) {
            var bufferedStream = new (require("bufferedstream"))();
            hijackedResponseBody.pipe(bufferedStream);
            bufferedStream.pipe(res);
          });
          next();
        })
        .use(function(req, res, next) {
          res.contentType("text/plain");
          res.write("foo");
          res.end("bar");
        });

      return expect(app, "to yield response", "foobar");
    });
    it.skip("Create a test server that hijacks the response and passes an error to next(), then run a request against it", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, function(res) {
            res.unhijack(function(res) {
              next(new Error("Error!"));
            });
          });
          next();
        })
        .use(function(req, res, next) {
          res.send("foo");
        })
        .use(require("errorhandler")({ log: false }));

      return expect(app, "to yield response", 500);
    });
    it("Create a test server that hijacks the response and immediately unhijacks it, then run a request against it", function() {
      var app = express()
        .use(function(req, res, next) {
          hijackResponse(res, function(hijackResponseBody, res) {
            // res.unhijack(true);
            hijackResponseBody.pipe(res);
          });
          next();
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
          hijackResponse(res, function(hijackedResponseBody, res) {
            hijackedResponseBody.pipe(res);
          });
          next();
        })
        .use(express.static(path.resolve(__dirname, "fixtures"))),
      "to yield exchange",
      {
        request: "GET /bigfile.txt",
        response: { body: /^0{1999998}$/ }
      }
    );
  });
  describe("against a real server", function() {
    let closeCallCount = 0;
    let closeSpy = () => {
      closeCallCount += 1;
    };
    let server = null;

    before(function() {
      return new Promise(function(resolve) {
        var app = express()
          .use((req, res, next) => {
            res.on("close", () => closeSpy());
            next();
          })
          .use(function(req, res, next) {
            hijackResponse(res, (hijackedResponseBody, res) =>
              hijackedResponseBody.pipe(res)
            );
            next();
          })
          .use(function(req, res) {
            res.write("foo");
          });

        server = http.Server(app);
        server.listen(0, function() {
          resolve(server);
        });
      });
    });

    it('should not prevent "close" events registered on res from firing when hijacking', function() {
      var port = server.address().port;

      return new Promise(function(resolve) {
        var request = http.request({ port: port }, function(res) {
          request.abort();
          setTimeout(() => resolve(), 10);
        });

        request.end();
      }).then(function() {
        expect({ closeCallCount }, "to satisfy", { closeCallCount: 1 });
      });
    });

    after(function() {
      server.close();
    });
  });

  describe("against a real proxied server", function() {
    before(function() {
      var self = this;

      this.proxy = null;
      this.source = null;

      return new Promise(function(resolve) {
        var app = express();

        app.use(function(req, res, next) {
          res.status(200);
          res.set("Content-Type", "text/plain");
          res.set("X-Source", "yes!");
          res.end("foo");
        });

        self.source = http.Server(app);

        self.source.listen(0, function() {
          resolve(self.source.address().port);
        });
      })
        .then(function(sourcePort) {
          return new Promise(function(resolve) {
            var app = express();

            app.use(function(req, res, next) {
              hijackResponse(res, function(hijackedResponseBody, res) {
                res.setHeader("X-Hijacked", "yes!");
                res.setHeader("transfer-encoding", "chunked"); // not set on > 0.10
                res.removeHeader("Content-Length"); // only set on > 0.10
                hijackedResponseBody.pipe(res);
              });
              next();
            });

            app.use(
              require("http-proxy-middleware")({
                target: "http://localhost:" + sourcePort,
                changeOrigin: true,
                logLevel: "silent"
              })
            );

            self.proxy = http.Server(app);

            self.proxy.listen(0, function() {
              resolve(self.proxy.address().port);
            });
          });
        })
        .then(function(proxyPort) {
          self.proxyPort = proxyPort;
        });
    });
    it("should not mangle response message", function() {
      var self = this;
      return new Promise(function(resolve, reject) {
        require("http").get(
          {
            host: "localhost",
            port: self.proxyPort,
            path: "",
            agent: false
          },
          function(res) {
            resolve(res);
          }
        );
      }).then(function(res) {
        return expect(res.headers, "to exhaustively satisfy", {
          "x-powered-by": "Express",
          "content-type": /text\/plain/,
          "transfer-encoding": "chunked",
          date: expect.it("to be a string"),
          connection: "close",
          "x-source": "yes!",
          "x-hijacked": "yes!"
        });
      });
    });
    after(function() {
      this.proxy.close();
      this.source.close();
    });
  });
});
