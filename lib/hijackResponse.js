var Readable = require('stream').Readable

module.exports = function hijackResponse (res, cb) {
  var writeHead = res.writeHead
  var write = res.write
  var end = res.end
  var originalResponse = res
  var hijacking = true
  var originalHasEnded = false
  var hijackedResponse = new Readable()
  hijackedResponse.__proto__ = originalResponse // eslint-disable-line no-proto

  var readableMethods = Object.keys(Readable.prototype)
  readableMethods.forEach(function (method) {
    hijackedResponse[method] = Readable.prototype[method].bind(hijackedResponse)
  })

  var _readReady = false
  var writeBuffer = []

  function maybeWrite (chunk, writeBuffer) {
    if (_readReady) {
      _readReady = hijackedResponse.push(chunk)
      return true
    } else {
      writeBuffer.push(chunk)
      return false
    }
  }

  function emptyWriteBuffer () {
    if (_readReady && writeBuffer.length > 0) {
      var newWriteBuffer = []
      writeBuffer.forEach(function (chunk) {
        maybeWrite(chunk, newWriteBuffer)
      })
      writeBuffer = newWriteBuffer
    }
  }

  hijackedResponse._read = function (size) {
    _readReady = true
    emptyWriteBuffer()
  }

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
      emptyWriteBuffer()
      return maybeWrite(chunk, writeBuffer)
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
    hijackedResponse.emit('originalend')
    originalHasEnded = true
    if (hijacking) {
      res.write(null)
    } else {
      end.call(originalResponse)
    }
  }

  hijackedResponse.write = function (chunk, encoding) {
    write.call(originalResponse, chunk, encoding)
  }

  hijackedResponse.end = function (chunk, encoding) {
    if (chunk) {
      write.call(originalResponse, chunk, encoding)
    }
    end.call(originalResponse)
  }

  hijackedResponse.__defineGetter__('statusCode', function () {
    return originalResponse.statusCode
  })

  hijackedResponse.__defineSetter__('statusCode', function (statusCode) {
    originalResponse.statusCode = statusCode
  })

  res.writeHead = function (statusCode, headers) {
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

  // Wait for the original response to end, then make the original res.write and res.end work again
  hijackedResponse.unhijack = function (restoreOriginal, cb) {
    if (typeof restoreOriginal === 'function') {
      cb = restoreOriginal
      restoreOriginal = false
    }
    if (restoreOriginal) {
      hijacking = false
    }
    if (originalHasEnded) {
      process.nextTick(function () {
        hijacking = false
        if (cb) {
          cb(null, originalResponse)
        }
      })
    } else {
      hijackedResponse.once('originalend', function () {
        hijacking = false
        if (cb) {
          cb(null, originalResponse)
        }
      })
    }
  }
}
