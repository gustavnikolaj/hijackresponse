const express = require('express');
const hijackResponse = require("../lib/hijackResponse");
const { Readable } = require("stream")
const expect = require("unexpected")
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

describe("calling res.writeHead", function() {
  it.only("simple case with status code", function() {
    var app = express()
      .use(function(req, res, next) {
        hijackResponse(res, next).then(hijackedResponse => {
          const chunks = [];
          hijackedResponse.readable
            .on("data", chunk => chunks.push(chunk))
            .on("end", () => {
              const result = Buffer.concat(chunks)
                .toString("utf-8")
                .toUpperCase();
              hijackedResponse.writable.write(Buffer.from(result));
              hijackedResponse.writable.end();
            });
        });
      })
      .use(function(req, res, next) {
        const readable = Readable.from(["foo", "bar", "baz"])
        res.setHeader('Content-Type', 'text/plain')
        res.writeHead(201);
        readable.pipe(res);
      });

    return expect(app, "to yield response", {
      statusCode: 201,
      body: "FOOBARBAZ"
    });
  });
});
