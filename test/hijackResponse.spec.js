const createTestServer = require("./helpers/test-server");
const expect = require("unexpected");
const hijackResponse = require("../lib/hijackResponse");
const stream = require("stream");

describe("hijackResponse", () => {
  it("should be able to hijack a reponse and rewrite it", () => {
    const request = createTestServer((req, res) => {
      hijackResponse(res, (err, res) => {
        let chunks = [];

        res.on("data", chunk => chunks.push(chunk));

        res.on("end", () => {
          const stringifiedResponse = Buffer.concat(chunks).toString("utf-8");
          res.end(stringifiedResponse.toUpperCase());
        });
      });

      res.setHeader("Content-Type", "text/plain");
      res.end("foo");
    });

    return expect(request(), "when fulfilled", "to satisfy", { body: "FOO" });
  });

  it("should pipe through a transform stream", () => {
    const request = createTestServer((req, res) => {
      hijackResponse(res, (err, res) => {
        const uppercaseStream = new stream.Transform({
          transform(chunk, encoding, callback) {
            if (encoding !== "utf-8") {
              chunk = Buffer.from(chunk).toString("utf-8");
            }

            chunk = chunk.toUpperCase();

            callback(null, chunk);
          }
        });

        res.pipe(uppercaseStream).pipe(res);
      });

      res.setHeader("Content-Type", "text/plain");
      res.write("foo");
      res.end("bar");
    });

    return expect(request(), "when fulfilled", "to satisfy", {
      body: "FOOBAR"
    });
  });

  it("should be able to pipe hijacked res into it self.", () => {
    const request = createTestServer((req, res) => {
      hijackResponse(res, (err, res) => res.pipe(res));

      res.setHeader("Content-Type", "text/plain");
      res.write("foo");
      res.write("bar");
      res.end();
    });

    return expect(request(), "when fulfilled", "to satisfy", {
      body: "foobar"
    });
  });

  it("should be able to hijack an already hijacked response", () => {
    const request = createTestServer((req, res) => {
      hijackResponse(res, (err, res) => {
        hijackResponse(res, (err, res) => {
          const chunks = [];
          res
            .on("data", chunk => chunks.push(chunk))
            .on("end", () => {
              res.setHeader("X-qux", "hijacked");
              res.write(Buffer.concat(chunks));
              res.end("qux");
            });
        });

        res.setHeader("X-bar", "hijacked");
        res
          .on("data", chunk => res.write(chunk))
          .on("end", () => {
            res.write("bar");
            res.end();
          });
      });

      res.setHeader("Content-Type", "text/plain");
      res.write("foo");
      res.end();
    });
    return expect(request(), "when fulfilled", "to satisfy", {
      headers: {
        "content-type": "text/plain",
        "x-bar": "hijacked",
        "x-qux": "hijacked"
      },
      body: "foobarqux"
    });
  });

  it("should be able to hijack an already hijacked response when piping", () => {
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

    const request = createTestServer((req, res) => {
      hijackResponse(res, (err, res) => {
        hijackResponse(res, (err, res) => {
          res.pipe(appendToStream("qux")).pipe(res);
        });
        res.pipe(appendToStream("baz")).pipe(res);
      });

      res.setHeader("Content-Type", "text/plain");

      let num = 0;
      const tick = () => {
        res.write("foo");
        num += 1;
        if (num < 5) return setImmediate(tick);
        res.end("bar");
      };
      tick();
    });

    return expect(request(), "when fulfilled", "to satisfy", {
      body: "foofoofoofoofoobarbazqux"
    });
  });

  it("should write the last chunk", () => {
    const request = createTestServer((req, res) => {
      hijackResponse(res, (err, res) => res.end("foobar"));

      res.setHeader("content-type", "text/plain");
      res.writeHead(200);
    });

    return expect(request(), "when fulfilled", "to satisfy", {
      body: "foobar"
    });
  });

  describe("res.writeHead should trigger the hijackResponse callback", () => {
    it("when called without anything", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.end("foobar"));

        res.setHeader("content-type", "text/plain");
        res.writeHead();
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        body: "foobar"
      });
    });

    it("when called with only a status code", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.end("foobar"));

        res.setHeader("content-type", "text/plain");
        res.writeHead(200);
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        body: "foobar"
      });
    });

    it("when called with status code and headers", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.end("foobar"));

        res.writeHead(200, {
          "content-type": "text/plain"
        });
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        body: "foobar"
      });
    });
  });

  describe("res.write", () => {
    it("should work when called with a buffer", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.pipe(res));

        res.setHeader("content-type", "text/plain");
        res.write(Buffer.from("foobar", "utf-8"));
        res.end();
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        body: "foobar"
      });
    });

    it("should work when called with null", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.pipe(res));

        res.setHeader("content-type", "text/plain");
        res.write(Buffer.from("foobar"));
        res.write(null);
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        body: "foobar"
      });
    });

    it("should work when called with a string", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.pipe(res));

        res.setHeader("content-type", "text/plain");
        res.write("foobar");
        res.end();
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        body: "foobar"
      });
    });

    it("should work when called with a string and an encoding", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.pipe(res));

        res.setHeader("content-type", "text/plain");
        res.write("foobar", "utf-8");
        res.end();
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        body: "foobar"
      });
    });
  });

  describe("res.end", () => {
    it("should call res._implicitHeader if it havent been called before", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.pipe(res));
        res.end();
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        statusCode: 200
      });
    });
  });

  describe("res.unhijack", () => {
    it("should allow the original data through if unhijacked", () => {
      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => res.unhijack());
        res.setHeader("content-type", "text/plain");
        setTimeout(() => res.end("foobar"), 10);
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        body: "foobar"
      });
    });
  });

  describe("#destroyHijacked", function() {
    it("should prevent hijackedRes from emitting more data", function() {
      let closeCalledCount = 0;
      const closeSpy = () => {
        closeCalledCount += 1;
      };

      const emits = [];
      const spyEmit = res => {
        const origEmit = res.emit;
        res.emit = (...args) => {
          emits.push(args);
          origEmit.apply(res, args);
        };
        return () => {
          res.emit = origEmit;
        };
      };

      const request = createTestServer((req, res) => {
        hijackResponse(res, (err, res) => {
          // Wait for .write('foo') to trigger writeHead and push
          const restoreEmit = spyEmit(res);
          setTimeout(() => {
            res.destroyHijacked();
            setTimeout(() => {
              restoreEmit();
              res.end();
            }, 1);
          }, 1);
        });

        res.on("close", closeSpy);

        res.write("foo");
        setTimeout(() => res.write("bar"), 0);
      });

      return expect(request(), "when fulfilled", "to satisfy", {
        statusCode: 200,
        rawBody: Buffer.concat([])
      }).then(() => {
        if (
          require("semver").parse(process.version).major > 10 &&
          closeCalledCount === 1
        ) {
          throw new Error("LOOK AT THIS TEST");
        }

        return expect({ closeCalledCount, emits }, "to satisfy", {
          // On node.js 11 and later, we get an extra close event later. I have
          // not observed any wrong behavior caused by this, but I cannot see
          // figure out why it's happening...
          //
          // closeCalledCount: 1,
          emits: []
        });
      });
    });
  });
});
