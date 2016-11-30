/* global describe, it, before, after */
var http = require('http')
var expect = require('unexpected')
  .clone()
  .use(require('unexpected-express'))
  .use(require('unexpected-sinon'))
  .addAssertion('to yield response', function (expect, subject, value) {
    return expect(subject, 'to yield exchange', {
      request: 'GET /',
      response: value
    })
  })
var sinon = require('sinon')
var express = require('express')
var passError = require('passerror')
var hijackResponse = require('../')

describe('Express Integration Tests', function () {
  it('simple case', function () {
    var app = express()
      .use(function (req, res, next) {
        hijackResponse(res, passError(next, function (res) {
          var chunks = []
          res.on('data', function (chunk) {
            chunks.push(chunk)
          })
          res.on('end', function () {
            var result = Buffer.concat(chunks).toString('utf-8').toUpperCase()
            res.write(new Buffer(result))
            res.end()
          })
        }))
        next()
      })
      .use(function (req, res, next) {
        res.setHeader('Content-Type', 'text/plain')
        return res.end('foobar')
      })

    return expect(app, 'to yield response', {
      statusCode: 200,
      body: 'FOOBAR'
    })
  })
  describe('adapted from express-hijackresponse', function () {
    it('Create a test server that pipes the hijacked response into itself, then do a request against it (simple variant)', function () {
      var app = express()
        .use(function (req, res, next) {
          hijackResponse(res, passError(next, function (res) {
            res.pipe(res)
          }))
          next()
        })
        .use(function (req, res, next) {
          res.send('foo')
        })

      return expect(app, 'to yield response', 'foo')
    })
    it('Create a test server that pipes the hijacked response into itself, then do a request against it (streaming variant)', function () {
      var app = express()
        .use(function (req, res, next) {
          hijackResponse(res, passError(next, function (res) {
            res.pipe(res)
          }))
          next()
        })
        .use(function (req, res, next) {
          var num = 0
          res.setHeader('Content-Type', 'text/plain')
          function proceed () {
            if (num < 5) {
              res.write('foo')
              num += 1
              process.nextTick(proceed)
            } else {
              res.end('bar')
            }
          }
          proceed()
        })

      return expect(app, 'to yield response', 'foofoofoofoofoobar')
    })
    it('Create a test server that pipes the original response through a buffered stream, then do a request against it (simple variant)', function () {
      var app = express()
        .use(function (req, res, next) {
          hijackResponse(res, passError(next, function (res) {
            var bufferedStream = new (require('bufferedstream'))()
            res.pipe(bufferedStream)
            bufferedStream.pipe(res)
          }))
          next()
        })
        .use(function (req, res, next) {
          res.send('foo')
        })

      return expect(app, 'to yield response', 'foo')
    })
    it('Create a test server that pipes the original response through a buffered stream, then do a request against it (streaming variant)', function () {
      var app = express()
        .use(function (req, res, next) {
          hijackResponse(res, passError(next, function (res) {
            var bufferedStream = new (require('bufferedstream'))()
            res.pipe(bufferedStream)
            bufferedStream.pipe(res)
          }))
          next()
        })
        .use(function (req, res, next) {
          res.contentType('text/plain')
          res.write('foo')
          res.end('bar')
        })

      return expect(app, 'to yield response', 'foobar')
    })
    it('Create a test server that hijacks the response and passes an error to next(), then run a request against it', function () {
      var app = express()
        .use(function (req, res, next) {
          hijackResponse(res, passError(function (res) {
            res.unhijack(function (res) {
              next(new Error('Error!'))
            })
          }))
          next()
        })
        .use(function (req, res, next) {
          res.send('foo')
        })
        .use(require('errorhandler')({ log: false }))

      return expect(app, 'to yield response', 500)
    })
    it('Create a test server that hijacks the response and immediately unhijacks it, then run a request against it', function () {
      var app = express()
        .use(function (req, res, next) {
          hijackResponse(res, passError(next, function (res) {
            res.unhijack(true)
          }))
          next()
        })
        .use(function (req, res, next) {
          res.send('foo')
        })

      return expect(app, 'to yield response', 'foo')
    })
  })

  it('should work when hijacking a big response body and the compression middleware is present above the hijacking middleware', function () {
    return expect(
      express()
        .use(require('compression')())
        .use(function (req, res, next) {
          hijackResponse(res, passError(next, function (res) {
            res.pipe(res)
          }))
          next()
        })
        .use(express.static(__dirname)),
      'to yield exchange', {
        request: 'GET /bigfile.txt',
        response: { body: /^0{1999998}$/ }
      }
    )
  })
  describe('against a real server', function () {
    before(function () {
      var self = this
      var spy = sinon.spy()

      this.spy = spy

      return new Promise(function (resolve) {
        var app = express()
          .use(function (req, res, next) {
            res.on('close', function () {
              spy()
              self.resolve()
            })

            next()
          })
          .use(function (req, res, next) {
            hijackResponse(res, passError(next, function (res) {
              res.pipe(res)
            }))

            next()
          })
          .use(function (req, res) {
            res.write('foo')
          })

        var server = http.Server(app)
        server.listen(0, function () {
          resolve(server)
        })
      }).then(function (server) {
        self.server = server
      })
    })
    it('should not prevent "close" events registered on res from firing when hijacking', function () {
      var self = this
      var port = this.server.address().port
      var spy = this.spy

      return new Promise(function (resolve) {
        self.resolve = resolve

        var options = {
          port: port
        }

        var request = http.request(options, function (res) {
          request.abort()
        })

        request.end()
      }).then(function () {
        expect(spy, 'was called')
      })
    })
    after(function () {
      this.server.close()
    })
  })
})
