/* global describe, it */
var expect = require('./unexpected-with-plugins')
var passError = require('passerror')
var hijackResponse = require('../')

describe('hijackResponse', function () {
  it('should be able to hijack a reponse and rewrite it', function () {
    return expect(function (res, handleError) {
      hijackResponse(res, passError(handleError, function (res) {
        var chunks = []
        res.on('data', function (chunk) {
          chunks.push(chunk)
        })
        res.on('end', function () {
          var result = Buffer.concat(chunks).toString('utf-8').toUpperCase()
          res.write(result, 'utf-8')
          res.end()
        })
      }))

      res.setHeader('Content-Type', 'text/plain')
      res.write('foo')
      res.end()
    }, 'to yield response', 'FOO')
  })
  it('should be able to pipe hijacked res into it self.', function () {
    return expect(function (res, handleError) {
      hijackResponse(res, passError(handleError, function (res) {
        res.pipe(res)
      }))

      res.setHeader('Content-Type', 'text/plain')
      res.write('foo')
      res.write('bar')
      res.end()
    }, 'to yield response', 'foobar')
  })
  it('should be able to hijack an already hijacked response', function () {
    return expect(function (res, handleError) {
      hijackResponse(res, passError(handleError, function (res) {
        hijackResponse(res, passError(handleError, function (res) {
          res.on('data', function (chunk) {
            res.write(chunk)
          }).on('end', function () {
            res.write('qux')
            res.end()
          })
        }))

        res.on('data', function (chunk) {
          res.write(chunk)
        }).on('end', function () {
          res.write('bar')
          res.end()
        })
      }))

      res.setHeader('Content-Type', 'text/plain')
      res.write('foo')
      res.end()
    }, 'to yield response', 'foobarqux')
  })
  it('should be able to hijack an already hijacked response when piping', function () {
    function appendToStream (value) {
      var Transform = require('stream').Transform
      var appendTo = new Transform({})
      appendTo._transform = function (chunk, encoding, cb) {
        this.push(chunk)
        cb()
      }
      appendTo._flush = function (cb) {
        this.push(new Buffer(value))
        cb()
      }
      return appendTo
    }
    return expect(function (res, handleError) {
      hijackResponse(res, passError(handleError, function (res) {
        hijackResponse(res, passError(handleError, function (res) {
          res.pipe(appendToStream('qux')).pipe(res)
        }))
        res.pipe(appendToStream('baz')).pipe(res)
      }))

      res.setHeader('Content-Type', 'text/plain')

      var num = 0
      function tick () {
        res.write('foo')
        num += 1
        if (num < 5) return setImmediate(tick)
        res.end('bar')
      }
      tick()
    }, 'to yield response', 'foofoofoofoofoobarbazqux')
  })

  it('should support backpreassure working with a good stream', function () {
    // This test aims to force the bastardized readable stream that is the
    // hijackedResponse to buffer up to it's highWaterMark, and not any further
    // and do multiple drains etc during the test. That is achieved by setting
    // the same highWaterMark on both the fs.ReadStream, the delayed Transform
    // stream and the hijackedResponse it self.

    var bufferMax = 0
    var drains = 0
    var highWaterMark = 100
    var streamOptions = { highWaterMark: highWaterMark }

    var filePath = require('path').resolve(__dirname, '..', 'package.json')
    var readStream = require('fs').createReadStream(filePath, streamOptions)

    var Transform = require('stream').Transform
    var delayedIdentityStream = new Transform(streamOptions)

    return expect(function (res, handleError) {
      hijackResponse(res, passError(handleError, function (res) {
        delayedIdentityStream._transform = function (chunk, encoding, cb) {
          setTimeout(function () {
            bufferMax = Math.max(bufferMax, res._readableState.length)
            cb(null, chunk)
          }, 1)
        }

        res.pipe(delayedIdentityStream).pipe(res)
      }), streamOptions)

      res.on('drain', function () { drains += 1 })
      readStream.pipe(res)
    }, 'to yield response', 200).then(function (res) {
      return expect(bufferMax, 'to equal', highWaterMark)
    }).then(function () {
      return expect(drains, 'to be greater than', 0)
    })
  })

  it('should support backpreassure working with a bad stream', function () {
    // This test aims to force the bastardized readable stream that is the
    // hijackedResponse to buffer up everything that has been written to it,
    // and try to support backpressure for the downstream-streams

    var drains = 0
    var highWaterMark = 5
    var streamOptions = { highWaterMark: highWaterMark }

    var stream = require('stream')

    var mockedReadStream = new stream.Readable()
    mockedReadStream._read = function () {}

    var delayedIdentityStream = new stream.Transform(streamOptions)

    return expect(function (res, handleError) {
      hijackResponse(res, passError(handleError, function (res) {
        delayedIdentityStream._transform = function (chunk, encoding, cb) {
          setTimeout(function () {
            cb(null, chunk)
          }, 3)
        }
        res.pipe(delayedIdentityStream).pipe(res)
      }), streamOptions)

      res.setHeader('Content-Type', 'text/plain')
      res.on('drain', function () { drains += 1 })

      res.write('foo 12345\n')
      res.write('bar 12345\n')
      res.write('baz 12345\n')
      res.write('qux 12345\n')
      res.end()

    }, 'to yield response', {
      body: [
        'foo 12345',
        'bar 12345',
        'baz 12345',
        'qux 12345',
        ''
      ].join('\n')
    }).then(function () {
      return expect(drains, 'to be greater than', 0)
    })
  })
  it('should write the last chunk', function () {
    return expect(function (res, handleError) {
      hijackResponse(res, passError(handleError, function (res) {
        res.end('foobar')
      }))

      res.setHeader('content-type', 'text/plain')
      res.writeHead(200)
    }, 'to yield response', 'foobar')
  })
})
