/* global describe, it */
var expect = require('unexpected')
  .clone()
  .use(require('unexpected-express'))
var express = require('express')
var hijackResponse = require('../')

describe('Express Integration Tests', function () {
  it('simple case', function () {
    var app = express()
      .use(function (req, res, next) {
        hijackResponse(res, function (err, res) {
          var chunks = []
          res.on('data', function (chunk) {
            chunks.push(chunk)
          })
          res.on('end', function () {
            var result = Buffer.concat(chunks).toString('utf-8').toUpperCase()
            res.write(new Buffer(result))
            res.end()
          })
        })
        next()
      })
      .use(function (req, res, next) {
        res.setHeader('Content-Type', 'text/plain')
        return res.end('foobar')
      })

    return expect(app, 'to yield exchange', {
      request: 'GET /',
      response: {
        statusCode: 200,
        body: 'FOOBAR'
      }
    })
  })
})
