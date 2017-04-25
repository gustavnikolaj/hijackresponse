var Readable = require('stream').Readable

module.exports = function hijackResponse (res, cb) {
  var writeHead = res.writeHead
  var write = res.write
  var end = res.end
  var originalResponse = res
  var hijacking = true
  var hijackedResponse = new Readable()
  hijackedResponse.__proto__ = originalResponse // eslint-disable-line no-proto
  hijackedResponse.emit = hijackedResponse.emit

  var readableMethods = Object.keys(Readable.prototype)
  readableMethods.forEach(function (method) {
    hijackedResponse[method] = Readable.prototype[method].bind(hijackedResponse)
  })

  hijackedResponse._read = function () {}

  res.write = function (rawChunk, encoding) {
    if (!res.headersSent && res.writeHead !== writeHead) res._implicitHeader()
    if (hijacking) {
      var chunk = rawChunk
      if (rawChunk !== null && !Buffer.isBuffer(chunk) && encoding !== 'buffer') {
        if (!encoding) {
          chunk = new Buffer(rawChunk)
        } else {
          chunk = new Buffer(rawChunk, encoding)
        }
      }
      hijackedResponse.push(chunk)
    } else {
      write.call(originalResponse, rawChunk, encoding)
    }
  }

  res.end = function (chunk, encoding) {
    if (chunk) {
      res.write(chunk, encoding)
    } else if (!res.headersSent && res.writeHead !== writeHead) {
      res._implicitHeader()
    }
    if (hijacking) {
      hijackedResponse.push(null)
    } else {
      end.call(originalResponse)
    }
  }

  var resEmit = res.emit
  res.emit = function (eventName) {
    if (eventName === 'close') {
      hijackedResponse.emit('close')
    }

    return resEmit.apply(this, arguments)
  }

  hijackedResponse.destroyHijacked = function () {
    res.write = res.end = function () {}
    hijackedResponse._readableState.buffer = []
    return resEmit.call(res, 'close')
  }

  hijackedResponse.write = function (chunk, encoding) {
    write.call(originalResponse, chunk, encoding)
  }

  hijackedResponse.end = function (chunk, encoding) {
    if (chunk) {
      write.call(originalResponse, chunk, encoding)
    }
    if (hijacking) {
      end.call(originalResponse)
    } else {
      // If unhijacked, delay end-event so pipes don't close too early giving
      // you a chance to have error handlers work.
      setImmediate(function () {
        end.call(originalResponse)
      })
    }
  }

  hijackedResponse.__defineGetter__('statusCode', function () {
    return originalResponse.statusCode
  })

  hijackedResponse.__defineSetter__('statusCode', function (statusCode) {
    originalResponse.statusCode = statusCode
  })

  res.writeHead = function (statusCode, statusMessage, headers) {
    if (typeof headers === 'undefined' && typeof statusMessage === 'object') {
      headers = statusMessage
      statusMessage = undefined
    }
    if (statusCode) {
      res.statusCode = statusCode
    }
    if (headers) {
      for (var headerName in headers) {
        res.setHeader(headerName, headers[headerName])
      }
    }
    res.writeHead = writeHead
    cb(null, hijackedResponse)
  }

  hijackedResponse.unhijack = function () {
    hijacking = false
    res.write = write
    res.end = end
    return originalResponse
  }
}
