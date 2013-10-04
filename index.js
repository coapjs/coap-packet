
// a global index for parsing the options and the payload
// we can do this as the parsing is a sync operation
var index

  // last five bits are 1
  // 31.toString(2) => '111111'
  , lowerCodeMask = 31

  , nextMsgId = 0
  
  , empty = new Buffer(0)

  , codes

codes = {
    'GET': 1
  , 'POST': 2
  , 'PUT': 3
  , 'DELETE': 4
  , 'get': 1
  , 'post': 2
  , 'put': 3
  , 'delete': 4
}

module.exports.generate = function generate(packet) {

  var buffer
    , byte
    , pos = 0

  if (!packet)
    packet = {}

  if (!packet.payload)
    packet.payload = empty

  if (!packet.token)
    packet.token = empty

  if (packet.token.length > 8)
    throw new Error('Token too long')

  if (!packet.code)
    packet.code = 'GET'

  if (!packet.messageId)
    packet.messageId = nextMsgId++

  if (nextMsgId === 65535)
    nextMsgId = 0

  buffer = new Buffer(5 + packet.payload.length + packet.token.length)

  byte = 0
  byte |= 1 << 6 // first two bits are version

  if (packet.confirmable)
    byte |= 0 << 4
  else if (packet.ack)
    byte |= 2 << 4
  else if (packet.reset)
    byte |= 3 << 4
  else
    byte |= 1 << 4 // the message is non-confirmable

  byte |= packet.token.length

  buffer.writeUInt8(byte, pos++)

  if (codes[packet.code])
    buffer.writeUInt8(codes[packet.code], pos++)
  else
    buffer.writeUInt8(toCode(packet.code), pos++)

  buffer.writeUInt16BE(packet.messageId, pos)
  pos += 2

  packet.token.copy(buffer, pos)
  pos += packet.token.length

  buffer.writeUInt8(255, pos++)

  packet.payload.copy(buffer, pos)

  return buffer
}

module.exports.parse = function parse(buffer) {
  index = 4

  return {
      version: parseVersion(buffer)
    , code: parseCode(buffer)
    , confirmable: parseConfirmable(buffer)
    , reset: parseReset(buffer)
    , ack: parseAck(buffer)
    , messageId: buffer.readUInt16BE(2)
    , token: parseToken(buffer)
    , options: parseOptions(buffer)
    , payload: buffer.slice(index + 1)
  }
}

function parseVersion(buffer) {
  var version = buffer.readUInt8(0) >> 6

  if (version !== 1)
    throw new Error('Unsupported version')

  return version
}

function parseConfirmable(buffer) {
  return (buffer.readUInt8(0) & 48) === 0
}

function parseReset(buffer) {
  // 110000 is 48
  return (buffer.readUInt8(0) & 48) === 48
}

function parseAck(buffer) {
  // 100000 is 32
  return (buffer.readUInt8(0) & 48) === 32
}

function parseCode(buffer) {
  var byte = buffer.readUInt8(1)
    , code = '' + (byte >> 5) + '.'

  byte = byte & lowerCodeMask

  if (byte < 10)
    code += '0' + byte
  else
    code += byte

  return code
}

function parseToken(buffer) {
  var length = buffer.readUInt8(0) & 15
    , result

  if (length > 8) {
    throw new Error('Token length not allowed')
  }

  result = buffer.slice(index, index + length)

  index += length

  return result
}

var numMap  = {
    '1': 'If-Match'
  , '3': 'Uri-Host'
  , '4': 'ETag'
  , '5': 'If-None-Match'
  , '7': 'Uri-Port'
  , '8': 'Location-Path'
  , '11': 'Uri-Path'
  , '12': 'Content-Format'
  , '14': 'Max-Age'
  , '15': 'Uri-Query'
  , '17': 'Accept'
  , '20': 'Location-Query'
  , '35': 'Proxy-Uri'
  , '39': 'Proxy-Scheme'
  , '60': 'Size1'
}

var optionNumberToString = (function genOptionParser() {

  var code = Object.keys(numMap).reduce(function(acc, key) {

    acc += 'case ' + key + ':\n'
    acc += '  return \'' + numMap[key] +'\'\n'

    return acc
  }, 'switch(number) {\n')

  code += 'default:\n'
  code += 'return \'\' + number'
  code += '}\n'

  return new Function('number', code)
})()

function parseOptions(buffer) {

  var byte
    , number = 0
    , delta
    , length
    , nextOption = true
    , options = {}

  while (true) {
    byte = buffer.readUInt8(index)

    if (byte === 255 || index > buffer.length) {
      break
    }

    delta = byte >> 4
    length = byte & 15

    index += 1

    if (delta === 13) {
      delta = buffer.readUInt8(index) + 13
      index += 1
    } else if (delta === 14) {
      delta = buffer.readUInt16BE(index) + 269
      index += 2
    } else if (delta === 15) {
      throw new Error('Wrong option delta')
    }

    if (length === 13) {
      length = buffer.readUInt8(index) + 13
      index += 1
    } else if (length === 14) {
      length = buffer.readUInt16BE(index) + 269
      index += 2
    } else if (length === 15) {
      throw new Error('Wrong option length')
    }

    number += delta

    options[optionNumberToString(number)] = buffer.slice(index, index + length)

    index += length
  }

  return options
}

function toCode(code) {
  var split = code.split('.')
    , byte  = 0
  
  byte |= parseInt(split[0]) << 5
  byte |= parseInt(split[1])

  return byte
}
