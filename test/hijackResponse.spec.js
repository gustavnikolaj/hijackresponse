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
})
