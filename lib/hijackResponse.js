var Stream = require('stream').Stream

module.exports = function hijackResponse (res, cb) {
  var writeHead = res.writeHead
  var write = res.write
  var end = res.end
  var originalResponse = res
  var hijacking = true
  var originalHasEnded = false
  var hijackedResponse = new Stream()

  Stream.call(hijackedResponse)

  hijackedResponse.readable = hijackedResponse.writable = true

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

  hijackedResponse.__proto__ = originalResponse // eslint-disable-line no-proto

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

  res.write = function (chunk, encoding) {
    if (!res.headersSent && res.writeHead !== writeHead) res._implicitHeader()
    if (hijacking) {
      hijackedResponse.emit('data', chunk, encoding)
    } else {
      write.call(res, chunk, encoding)
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
      // Prevent .pipe from cleaning up too soon:
      process.nextTick(function () {
        hijackedResponse.emit('end')
      })
    } else {
      end.call(res)
    }
  }
}
