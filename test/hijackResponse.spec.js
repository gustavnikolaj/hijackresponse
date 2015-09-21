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
    function appendToStream(value) {
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
})
