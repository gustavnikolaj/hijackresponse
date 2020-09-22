const http = require("http");

module.exports = function createTestServer(serverImplementation) {
  const server = http.createServer(serverImplementation);
  const listener = server.listen();

  const close = () =>
    new Promise(resolve => server.close(() => resolve("foo")));

  const makeRequest = () =>
    new Promise(resolve => {
      const resolveAndClose = (err, value) =>
        resolve(
          close().then(() => {
            if (err) {
              throw err;
            }
            return value;
          })
        );

      const req = http.get({ port: listener.address().port });

      req.once("response", res => {
        const value = {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers
        };
        const contentType = res.headers && res.headers["content-type"];
        const chunks = [];
        res
          .on("data", chunk => {
            chunks.push(chunk);
          })
          .on("end", () => {
            const responseBody = Buffer.concat(chunks);
            value.rawBody = responseBody;

            if (contentType === "application/json") {
              try {
                const parsedBody = JSON.parse(responseBody.toString("utf-8"));
                value.body = parsedBody;
              } catch (e) {}
            } else if (/^text\//.test(contentType)) {
              value.body = responseBody.toString("utf-8");
            }

            return resolveAndClose(null, value);
          })
          .on("error", err => resolveAndClose(err));
      });

      req.on("error", err => resolveAndClose(err));

      req.end();
    });

  return makeRequest;
};
