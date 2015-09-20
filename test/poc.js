var Writable = require('stream').Writable
var Readable = require('stream').Readable
var Transform = require('stream').Transform

var Stream = require('stream').Stream

var convertToUpperCaseTransformStream = new Transform()
convertToUpperCaseTransformStream._transform = function (chunk, encoding, cb) {
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

  hijackedRes._read = function (size) {
    _readReady = true
  }

  res.write = function (chunk, encoding) {
    if (_readReady && writeBuffer.length > 0) {
      var newWriteBuffer = []
      writeBuffer.forEach(function (obj) {
        if (_readReady) {
          _readReady = hijackedRes.push(obj.chunk)
        } else {
          newWriteBuffer.push(obj)
        }
      })
      writeBuffer = newWriteBuffer
    }
    if (_readReady) {
      _readReady = hijackedRes.push(chunk)
    } else {
      writeBuffer.push({
        chunk: chunk,
        encoding: encoding
      })
    }
  }

  res.end = function (chunk, encoding) {
    if (chunk) {
      res.write(chunk, encoding)
    }
    res.write(null)
  }

  hijackedRes.write = function (chunk, encoding) {
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

// hijack(res, function (err, res) {
//   res
//     .pipe(convertToUpperCaseTransformStream)
//     .pipe(res)
// })

hijack(res, function (err, res) {
  res.on('data', function (chunk) {
    console.log('on data', chunk.toString().replace('\n', '\\n'))
    setTimeout(function () { res.write(chunk) }, 2)
  }).on('end', function () {
    console.log('on end')
    setTimeout(function () { res.end() }, 4)
  })
})

res.write('foo')
res.write('bar')
res.end('\n')
