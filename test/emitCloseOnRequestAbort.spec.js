const expect = require("unexpected");
const http = require("http");
const hijackResponse = require("../lib/hijackResponse");

describe("with a aborted request", function() {
  var handleRequest;
  var server;
  var serverAddress;
  var serverHostname;
  var serverUrl;

  beforeEach(function() {
    handleRequest = undefined;
    server = http
      .createServer(function(req, res) {
        res.sendDate = false;
        handleRequest(req, res);
      })
      .listen(0);
    serverAddress = server.address();
    serverHostname =
      serverAddress.address === "::" ? "localhost" : serverAddress.address;
    serverUrl = "http://" + serverHostname + ":" + serverAddress.port + "/";
  });

  afterEach(function() {
    server.close();
  });

  it("should emit the close event on the hijacked response", function() {
    return expect.promise(function(run) {
      handleRequest = run(function(req, res) {
        hijackResponse(
          res,
          run(function(hijackedResponseBody, res) {
            res.on(
              "close",
              run(function() {})
            );
          })
        );
        res.end("yaddayadda");
      });
      var request = http.get(serverUrl);

      request.on("finish", () => {
        // abort the request as soon as the request body has been submitted.
        request.abort();
      });

      request.on(
        "error",
        run(function(err) {
          expect(err, "to have message", "socket hang up");
        })
      );
    });
  });
});
