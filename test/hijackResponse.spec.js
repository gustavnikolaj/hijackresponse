/* global describe, it, beforeEach, afterEach */
var expect = require('./unexpected-with-plugins')
var passError = require('passerror')
var http = require('http')
var hijackResponse = require('../')
var sinon = require('sinon')

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
          var chunks = []
          res.on('data', function (chunk) {
            chunks.push(chunk)
          }).on('end', function () {
            res.setHeader('X-qux', 'hijacked')
            res.write(Buffer.concat(chunks))
            res.end('qux')
          })
        }))

        res.setHeader('X-bar', 'hijacked')
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
    }, 'to yield response', {
      headers: {
        'X-qux': 'hijacked',
        'X-bar': 'hijacked'
      },
      body: 'foobarqux'
    })
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

  it('should write the last chunk', function () {
    return expect(function (res, handleError) {
      hijackResponse(res, passError(handleError, function (res) {
        res.end('foobar')
      }))

      res.setHeader('content-type', 'text/plain')
      res.writeHead(200)
    }, 'to yield response', 'foobar')
  })
  describe('res.writeHead should trigger the hijackResponse callback', function () {
    it('when called without anything', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.end('foobar')
        }))

        res.setHeader('content-type', 'text/plain')
        res.writeHead()
      }, 'to yield response', 'foobar')
    })
    it('when called with only a status code', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.end('foobar')
        }))

        res.setHeader('content-type', 'text/plain')
        res.writeHead(200)
      }, 'to yield response', 'foobar')
    })
    it('when called with status code and headers', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.end('foobar')
        }))

        res.writeHead(200, {
          'content-type': 'text/plain'
        })
      }, 'to yield response', 'foobar')
    })
  })
  describe('res.write', function () {
    it('should work when called with a buffer', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.pipe(res)
        }))

        res.setHeader('content-type', 'text/plain')
        res.write(new Buffer('foobar', 'utf-8'))
        res.end()
      }, 'to yield response', 'foobar')
    })
    it('should work when called with null', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.pipe(res)
        }))

        res.setHeader('content-type', 'text/plain')
        res.write(new Buffer('foobar', 'utf-8'))
        res.write(null)
      }, 'to yield response', 'foobar')
    })
    it('should work when called with a string', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.pipe(res)
        }))

        res.setHeader('content-type', 'text/plain')
        res.write('foobar')
        res.end()
      }, 'to yield response', 'foobar')
    })
    it('should work when called with a string and an encoding', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.pipe(res)
        }))

        res.setHeader('content-type', 'text/plain')
        res.write('foobar', 'utf-8')
        res.end()
      }, 'to yield response', 'foobar')
    })
  })
  describe('res.end', function () {
    it('should call res._implicitHeader if it havent been called before', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.pipe(res)
        }))
        res.end()
      }, 'to yield response', 200)
    })
  })
  describe('res.unhijack', function () {
    it('should allow the original data through if unhijacked', function () {
      return expect(function (res, handleError) {
        hijackResponse(res, passError(handleError, function (res) {
          res.unhijack()
        }))
        res.setHeader('content-type', 'text/plain')
        setTimeout(function () {
          res.write('foobar')
          res.end()
        }, 10)
      }, 'to yield response', 'foobar')
    })
  })
  describe('against a real server', function () {
    var handleRequest
    var server
    var serverAddress
    var serverHostname
    var serverUrl
    beforeEach(function () {
      handleRequest = undefined
      server = http.createServer(function (req, res) {
        res.sendDate = false
        handleRequest(req, res)
      }).listen(0)
      serverAddress = server.address()
      serverHostname = serverAddress.address === '::' ? 'localhost' : serverAddress.address
      serverUrl = 'http://' + serverHostname + ':' + serverAddress.port + '/'
    })
    afterEach(function () {
      server.close()
    })
    it('should emit the close event on the hijacked response', function () {
      return expect.promise(function (run) {
        handleRequest = run(function (req, res) {
          hijackResponse(res, run(function (err, res) {
            expect(err, 'to be falsy')
            res.on('close', run(function () {}))
          }))
          res.end('yaddayadda')
        })
        var request = http.get(serverUrl)
        request.end('foo')
        setTimeout(function () {
          request.abort()
        }, 10)
        request.on('error', run(function (err) {
          expect(err, 'to have message', 'socket hang up')
        }))
      })
    })
  })
  describe('#destroyHijacked', function () {
    it('should prevent hijackedRes from emitting more data', function () {
      return expect(function (res, handleError) {
        var closeSpy = sinon.spy()
        hijackResponse(res, passError(handleError, function (res) {
          setTimeout(function () { // Wait for .write('foo') to trigger writeHead and push
            sinon.spy(res, 'emit')
            res.destroyHijacked()
            setTimeout(function () {
              expect(res._readableState.buffer, 'to equal', [])
              expect(res.emit, 'to have calls satisfying', [])
              expect(closeSpy, 'to have calls satisfying', function () {
                closeSpy()
              })
              res.end()
            }, 1)
          }, 1)
        }))

        res.on('close', closeSpy)
        res.write('foo')
        setTimeout(function () {
          res.write('bar')
        }, 0)
      }, 'to yield response', {
        statusCode: 200,
        unchunkedBody: expect.it('to equal', new Buffer([])).or('to be undefined')
      })
    })
  })
})
