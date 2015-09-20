var Writable = require('stream').Writable
var Readable = require('stream').Readable
var Transform = require('stream').Transform

var debug = require('debug')('hijack:debug')
var info = require('debug')('hijack:info')
var log = require('debug')('hijack:log')

var Stream = require('stream').Stream

var convertToUpperCaseTransformStream = new Transform()
convertToUpperCaseTransformStream.count = 0
convertToUpperCaseTransformStream._transform = function (chunk, encoding, cb) {
  if (convertToUpperCaseTransformStream.count === 0) {
    convertToUpperCaseTransformStream.count += 1
    return setTimeout(function () {
      if (encoding === 'buffer') {
        var result = []
        for (var i = 0; i < chunk.length; ++i) {
          var charCode = chunk[i]
          if (charCode > 96 && charCode < 123) {
            charCode = charCode - 32
          }
          result.push(charCode)
        }
        this.push(new Buffer(result))
        return cb()
      }
      return cb(new Error('chunk not a buffer!'))
    }.bind(this), 1000)
  }
  if (encoding === 'buffer') {
    var result = []
    for (var i = 0; i < chunk.length; ++i) {
      var charCode = chunk[i]
      if (charCode > 96 && charCode < 123) {
        charCode = charCode - 32
      }
      result.push(charCode)
    }
    this.push(new Buffer(result))
    return cb()
  }
  return cb(new Error('chunk not a buffer!'))
}

//process.stdin
//  .pipe(convertToUpperCaseTransformStream)
//  .pipe(process.stdout)

function hijack (res, cb) {
  var origWrite = res.write
  var origEnd = res.end
  var origRes = res

  var hijackedRes = new Readable()
  hijackedRes.__proto__ = origRes

  var readableMethods = Object.keys(Readable.prototype)
  readableMethods.forEach(function (method) {
    hijackedRes[method] = Readable.prototype[method].bind(hijackedRes)
  })

  var _readReady = false
  var writeBuffer = []

  function maybeWrite (chunk, writeBuffer) {
    maybeNot = _readReady ? 'not ' : ''
    debug('hijacked data from res. ' + maybeNot + 'buffering')
      if (_readReady) {
        _readReady = hijackedRes.push(chunk)
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

  hijackedRes._read = function (size) {
    debug('_read called %s [from _readReady state %s]', size, _readReady)
    _readReady = true

    emptyWriteBuffer()
    return
  }

  res.write = function (rawChunk, encoding) {
    var chunk = rawChunk
    if (rawChunk !== null && !Buffer.isBuffer(chunk) && encoding !== 'buffer') {
      if (!encoding) {
        chunk = new Buffer(rawChunk)
      } else {
        chunk = new Buffer(rawChunk, encoding)
      }
    }
    debug('res.write called with "%s"', rawChunk ? rawChunk.toString().replace('\n', '\\n') : 'null')
    emptyWriteBuffer()
    return maybeWrite(chunk, writeBuffer)
  }

  res.end = function (chunk, encoding) {
    if (chunk) {
      res.write(chunk, encoding)
    }
    res.write(null)
  }

  hijackedRes.write = function (chunk, encoding) {
    debug('hijackedRes.write called')
    origWrite.call(origRes, chunk, encoding)
  }

  hijackedRes.end = function (chunk, encoding) {
    if (chunk) {
      origWrite.call(origRes, chunk, encoding)
    }
    origEnd.call(origRes)
  }

  return cb(null, hijackedRes)
}

var res = new Writable()

res._write = function (chunk, encoding, next) {
  if (encoding === 'buffer') {
    process.stdout.write(chunk)
    return next()
  }
  throw new Error('not a buffer!')
}



hijack(res, function (err, res) {
  res
    .pipe(convertToUpperCaseTransformStream)
    .pipe(res)
})

hijack(res, function (err, res) {
  res.on('data', function (chunk) {
    console.log('on data', chunk.toString().replace('\n', '\\n'))
    setTimeout(function () { res.write(chunk) }, 2)
  }).on('end', function () {
    console.log('on end')
    setTimeout(function () { res.end() }, 4)
  })
})

// var i = 0
// while ((res.write('foo ') !== false ) || i < 10) {
//   res.write('foo ')
//   i++
// }

res.write('bar')
res.end('\n')


res.on('end', function () {
  console.log('ended')
  process.exit(0)
})
