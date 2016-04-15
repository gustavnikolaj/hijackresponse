var http = require('http')
var stream = require('stream')
var _ = require('lodash')
var messy = require('messy')
var expect = require('unexpected')
  .clone()
  .use(require('unexpected-messy'))
  .use(require('unexpected-sinon'))
  .addAssertion('to yield response', function (expect, subject, value) {
    var req = new http.IncomingMessage()
    var res = new http.ServerResponse(req)

    var rawResponseChunks = []
    res.assignSocket(new stream.Writable())
    res.connection._write = function (chunk, encoding, cb) {
      rawResponseChunks.push(chunk)
      cb()
    }

    return expect.promise(function (resolve, reject) {
      ['write', 'end', 'destroy'].forEach(function (methodName) {
        var orig = res[methodName]
        res[methodName] = function (chunk, encoding) {
          var returnValue = orig.apply(this, arguments)
          if (methodName === 'end' || methodName === 'destroy') {
            resolve()
          }
          // Don't attempt to implement backpressure, since we're buffering the
          // entire response anyway.
          if (methodName !== 'write') {
            return returnValue
          }
        }
      })
      subject(res, function handleError (err) {
        reject(err)
      })
    }).then(function () {
      if (!res.headersSent) {
        // Make sure that the already set headers get flushed:
        res.writeHead(404)
      }

      var responseOptions
      if (rawResponseChunks.length > 0) {
        responseOptions = Buffer.concat(rawResponseChunks)
      } else {
        responseOptions = res._header || undefined
      }

      var httpResponse = new messy.HttpResponse(responseOptions)
      httpResponse.statusCode = httpResponse.statusCode || res.statusCode

      var expectedResponseProperties
      if (typeof value === 'number') {
        expectedResponseProperties = {statusCode: value}
      } else if (typeof value === 'string' || Buffer.isBuffer(value)) {
        expectedResponseProperties = {body: value}
      } else {
        expectedResponseProperties = _.extend({}, value)
      }

      return expect(httpResponse, 'to satisfy', expectedResponseProperties)
    })
  })

module.exports = expect
