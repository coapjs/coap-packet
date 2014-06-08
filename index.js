
var empty = new Buffer(0)

  // a global index for parsing the options and the payload
  // we can do this as the parsing is a sync operation
  , index

  // last five bits are 1
  // 31.toString(2) => '111111'
  , lowerCodeMask = 31

  , nextMsgId = Math.floor(Math.random() * 65535)

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
    , options
    , i
    , length

  packet = fillGenDefaults(packet)
  options = prepareOptions(packet)
  length = calculateLength(packet, options)

  if (length > 1280)
    throw new Error('Max packet size is 1280: current is ' + length)

  buffer = new Buffer(length)

  // first byte
  byte = 0
  byte |= 1 << 6 // first two bits are version
  byte |= confirmableAckResetMask(packet)
  byte |= packet.token.length
  buffer.writeUInt8(byte, pos++)

  // code can be humized or not
  if (codes[packet.code])
    buffer.writeUInt8(codes[packet.code], pos++)
  else
    buffer.writeUInt8(toCode(packet.code), pos++)

  // two bytes for the message id
  buffer.writeUInt16BE(packet.messageId, pos)
  pos += 2

  // the token might be an empty buffer
  packet.token.copy(buffer, pos)
  pos += packet.token.length

  // write the options
  for (i = 0; i < options.length; i++) {
    options[i].copy(buffer, pos)
    pos += options[i].length
  }

  if (packet.code !== '0.00' && packet.payload != '') {

    // payload separator
    buffer.writeUInt8(255, pos++)
    packet.payload.copy(buffer, pos)
  }

  return buffer
}

module.exports.parse = function parse(buffer) {
  index = 4
  parseVersion(buffer)

  var result = {
      code: parseCode(buffer)
    , confirmable: parseConfirmable(buffer)
    , reset: parseReset(buffer)
    , ack: parseAck(buffer)
    , messageId: buffer.readUInt16BE(2)
    , token: parseToken(buffer)
    , options: null
    , payload: null
  }

  if (result.code !== '0.00') {
    result.options = parseOptions(buffer)
    result.payload = buffer.slice(index + 1)
  } else {
    if (buffer.length != 4)
      throw new Error('Empty messages must be empty')

    result.options = []
    result.payload = empty
  }

  return result
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
  , '6': 'Observe'
  , '7': 'Uri-Port'
  , '8': 'Location-Path'
  , '11': 'Uri-Path'
  , '12': 'Content-Format'
  , '14': 'Max-Age'
  , '15': 'Uri-Query'
  , '17': 'Accept'
  , '20': 'Location-Query'
  , '23': 'Block2'
  , '27': 'Block1'
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
    , options = []
    , option

  while (index < buffer.length) {
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

    options.push({
        name: optionNumberToString(number)
      , value: buffer.slice(index, index + length)
    })

    index += length
  }

  return options
}

function toCode(code) {
  var split = code.split && code.split('.')
    , by = 0

  if (split && split.length === 2) {
    by |= parseInt(split[0]) << 5
    by |= parseInt(split[1])
  } else {

    if (!split)
      code = parseInt(code)

    by |= (code / 100) << 5
    by |= (code % 100)
  }

  return by
}

function fillGenDefaults(packet) {

  if (!packet)
    packet = {}

  if (!packet.payload)
    packet.payload = empty

  if (!packet.token)
    packet.token = empty

  if (packet.token.length > 8)
    throw new Error('Token too long')

  if (!packet.code)
    packet.code = '0.01'

  if (!packet.messageId)
    packet.messageId = nextMsgId++

  if (!packet.options)
    packet.options = []

  if (nextMsgId === 65535)
    nextMsgId = 0

  if (!packet.confirmable)
    packet.confirmable = false

  if (!packet.reset)
    packet.reset = false

  if (!packet.ack)
    packet.ack = false

  return packet
}

function confirmableAckResetMask(packet) {
  var result

  if (packet.confirmable)
    result = 0 << 4
  else if (packet.ack)
    result = 2 << 4
  else if (packet.reset)
    result = 3 << 4
  else
    result = 1 << 4 // the message is non-confirmable

  return result
}

function calculateLength(packet, options) {
  var length = 4 + packet.payload.length + packet.token.length
    , i

  if (packet.code !== '0.00' && packet.payload != '')
    length += 1

  for (i = 0; i < options.length; i++) {
    length += options[i].length
  }

  return length
}

var optionStringToNumber = (function genOptionParser() {

  var code = Object.keys(numMap).reduce(function(acc, key) {

    acc += 'case \'' + numMap[key] + '\':\n'
    acc += '  return \'' + key +'\'\n'

    return acc
  }, 'switch(string) {\n')

  code += 'default:\n'
  code += 'return parseInt(string)'
  code += '}\n'

  return new Function('string', code)
})()

var nameMap = Object.keys(numMap).reduce(function(acc, key) {
  acc[numMap[key]] = key
  return acc
}, {})

function optionSorter(a, b) {
  a = a.name
  b = b.name

  a = parseInt(nameMap[a] || a)
  b = parseInt(nameMap[b] || b)

  if (a < b)
    return -1
  if (a > b)
    return 1

  return 0
}

function prepareOptions(packet) {
  var options = []
    , total = 0
    , delta
    , buffer
    , byte
    , option
    , i
    , bufferSize
    , pos
    , value

  packet.options.sort(optionSorter)

  for (i = 0; i < packet.options.length; i++) {
    pos = 0
    option = packet.options[i].name
    delta = optionStringToNumber(option) - total
    value = packet.options[i].value

    // max option length is 1 header, 2 ext numb, 2 ext length
    buffer = new Buffer(value.length + 5)

    byte = 0


    if (delta <= 12) {
      byte |= delta << 4
    } else if (delta > 12 && delta < 269) {
      byte |= 13 << 4
    } else {
      byte |= 14 << 4
    }

    if (value.length <= 12) {
      byte |= value.length
    } else if (value.length > 12 && value.length < 269) {
      byte |= 13
    } else {
      byte |= 14
    }

    buffer.writeUInt8(byte, pos++)

    if (delta > 12 && delta < 269) {
      buffer.writeUInt8(delta - 13, pos++)
    } else if (delta >= 269) {
      buffer.writeUInt16BE(delta - 269, pos)
      pos += 2
    }

    if (value.length > 12 && value.length < 269) {
      buffer.writeUInt8(value.length - 13, pos++)
    } else if (value.length >= 269) {
      buffer.writeUInt16BE(value.length - 269, pos)
      pos += 2
    }

    value.copy(buffer, pos)
    pos += value.length
    total += delta
    options.push(buffer.slice(0, pos))
  }

  return options
}
