
const empty = Buffer.alloc(0)

// a global index for parsing the options and the payload
// we can do this as the parsing is a sync operation
let index

// last five bits are 1
// 31.toString(2) => '111111'
const lowerCodeMask = 31

let nextMsgId = Math.floor(Math.random() * 65535)

const codes = {
  GET: 1,
  POST: 2,
  PUT: 3,
  DELETE: 4,
  FETCH: 5,
  PATCH: 6,
  iPATCH: 7,
  get: 1,
  post: 2,
  put: 3,
  delete: 4,
  fetch: 5,
  patch: 6,
  ipatch: 7
}

module.exports.generate = function generate (packet, maxLength = 1280) {
  let pos = 0

  packet = fillGenDefaults(packet)
  const options = prepareOptions(packet)
  const length = calculateLength(packet, options)
  const tokenLength = packet.token.length
  let tokenMask

  if (tokenLength < 13) {
    tokenMask = tokenLength
  } else if (tokenLength < 270) {
    tokenMask = 13
  } else if (tokenLength < 65805) {
    tokenMask = 14
  }

  if (length > maxLength) {
    throw new Error(`Max packet size is ${maxLength}: current is ${length}`)
  }

  const buffer = Buffer.alloc(length)

  // first byte
  let byte = 0
  byte |= 1 << 6 // first two bits are version
  byte |= confirmableAckResetMask(packet)
  byte |= tokenMask
  buffer.writeUInt8(byte, pos++)

  // code can be humized or not
  if (codes[packet.code]) {
    buffer.writeUInt8(codes[packet.code], pos++)
  } else {
    buffer.writeUInt8(toCode(packet.code), pos++)
  }

  // two bytes for the message id
  buffer.writeUInt16BE(packet.messageId, pos)
  pos += 2

  if (tokenLength > 268) {
    buffer.writeUInt16BE(tokenLength - 269, pos)
    pos += 2
  } else if (tokenLength > 12) {
    buffer.writeUInt8(tokenLength - 13, pos)
    pos++
  }

  // the token might be an empty buffer
  packet.token.copy(buffer, pos)
  pos += tokenLength

  // write the options
  for (let i = 0; i < options.length; i++) {
    options[i].copy(buffer, pos)
    pos += options[i].length
  }

  if (packet.code !== '0.00' && packet.payload.toString() !== '') {
    // payload separator
    buffer.writeUInt8(255, pos++)
    packet.payload.copy(buffer, pos)
  }

  return buffer
}

module.exports.parse = function parse (buffer) {
  index = 4
  parseVersion(buffer)

  const result = {
    code: parseCode(buffer),
    confirmable: parseConfirmable(buffer),
    reset: parseReset(buffer),
    ack: parseAck(buffer),
    messageId: buffer.readUInt16BE(2),
    token: parseToken(buffer),
    options: null,
    payload: null
  }

  if (result.code !== '0.00') {
    result.options = parseOptions(buffer)
    result.payload = buffer.slice(index + 1)
  } else {
    if (buffer.length !== 4) {
      throw new Error('Empty messages must be empty')
    }

    result.options = []
    result.payload = empty
  }

  return result
}

function parseVersion (buffer) {
  const version = buffer.readUInt8(0) >> 6

  if (version !== 1) {
    throw new Error('Unsupported version')
  }

  return version
}

function parseConfirmable (buffer) {
  return (buffer.readUInt8(0) & 48) === 0
}

function parseReset (buffer) {
  // 110000 is 48
  return (buffer.readUInt8(0) & 48) === 48
}

function parseAck (buffer) {
  // 100000 is 32
  return (buffer.readUInt8(0) & 48) === 32
}

function parseCode (buffer) {
  let byte = buffer.readUInt8(1)
  let code = '' + (byte >> 5) + '.'

  byte = byte & lowerCodeMask

  if (byte < 10) {
    code += '0' + byte
  } else {
    code += byte
  }

  return code
}

function parseToken (buffer) {
  let length = buffer.readUInt8(0) & 15

  if (length === 13) {
    length = buffer.readUInt8(index) + 13
    index += 1
  } else if (length === 14) {
    length = buffer.readUInt16BE(index) + 269
    index += 2
  } else if (length === 15) {
    throw new Error('Token length not allowed')
  }

  const result = buffer.slice(index, index + length)

  index += length

  return result
}

const OPTIONS_BY_NAME = {
  'If-Match': 1,
  'Uri-Host': 3,
  ETag: 4,
  'If-None-Match': 5,
  Observe: 6,
  'Uri-Port': 7,
  'Location-Path': 8,
  OSCORE: 9,
  'Uri-Path': 11,
  'Content-Format': 12,
  'Max-Age': 14,
  'Uri-Query': 15,
  'Hop-Limit': 16,
  Accept: 17,
  'Q-Block1': 19,
  'Location-Query': 20,
  Block2: 23,
  Block1: 27,
  Size2: 28,
  'Q-Block2': 31,
  'Proxy-Uri': 35,
  'Proxy-Scheme': 39,
  Size1: 60,
  'No-Response': 258,
  'OCF-Accept-Content-Format-Version': 2049,
  'OCF-Content-Format-Version': 2053
}

const OPTIONS_BY_NUMBER = new Array(2054)
for (const key in OPTIONS_BY_NAME) {
  const number = OPTIONS_BY_NAME[key]
  OPTIONS_BY_NUMBER[number] = key
}

function optionNumberToString (number) {
  const string = OPTIONS_BY_NUMBER[number]
  if (string) return string
  return '' + number
}

function optionStringToNumber (string) {
  const number = OPTIONS_BY_NAME[string]
  if (number) return number
  return parseInt(string)
}

function parseOptions (buffer) {
  let number = 0
  const options = []

  while (index < buffer.length) {
    const byte = buffer.readUInt8(index)

    if (byte === 255 || index > buffer.length) {
      break
    }

    let delta = byte >> 4
    let length = byte & 15

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
      name: optionNumberToString(number),
      value: buffer.slice(index, index + length)
    })

    index += length
  }

  return options
}

function toCode (code) {
  const split = code.split && code.split('.')
  let by = 0

  if (split && split.length === 2) {
    by |= parseInt(split[0]) << 5
    by |= parseInt(split[1])
  } else {
    if (!split) {
      code = parseInt(code)
    }

    by |= (code / 100) << 5
    by |= (code % 100)
  }

  return by
}

function fillGenDefaults (packet) {
  if (!packet) {
    packet = {}
  }

  if (!packet.payload) {
    packet.payload = empty
  }

  if (!packet.token) {
    packet.token = empty
  }

  if (packet.token.length > 65804) {
    throw new Error('Token too long')
  }

  if (!packet.code) {
    packet.code = '0.01'
  }

  if (packet.messageId == null) {
    packet.messageId = nextMsgId++
  }

  if (!packet.options) {
    packet.options = []
  }

  if (nextMsgId === 65535) {
    nextMsgId = 0
  }

  if (!packet.confirmable) {
    packet.confirmable = false
  }

  if (!packet.reset) {
    packet.reset = false
  }

  if (!packet.ack) {
    packet.ack = false
  }

  return packet
}

function confirmableAckResetMask (packet) {
  let result

  if (packet.confirmable) {
    result = 0 << 4
  } else if (packet.ack) {
    result = 2 << 4
  } else if (packet.reset) {
    result = 3 << 4
  } else {
    result = 1 << 4 // the message is non-confirmable
  }

  return result
}

function calculateLength (packet, options) {
  let length = 4 + packet.payload.length + packet.token.length

  if (packet.token.length > 12) {
    length += 1
  }

  if (packet.token.length > 268) {
    length += 1
  }

  if (packet.code !== '0.00' && packet.payload.toString() !== '') {
    length += 1
  }

  for (let i = 0; i < options.length; i++) {
    length += options[i].length
  }

  return length
}

function optionSorter (a, b) {
  a = a.name
  b = b.name

  a = parseInt(OPTIONS_BY_NAME[a] || a)
  b = parseInt(OPTIONS_BY_NAME[b] || b)

  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }

  return 0
}

function prepareOptions (packet) {
  const options = []
  let total = 0
  let delta
  let buffer
  let byte
  let option
  let i
  let pos
  let value

  packet.options.sort(optionSorter)

  for (i = 0; i < packet.options.length; i++) {
    pos = 0
    option = packet.options[i].name
    delta = optionStringToNumber(option) - total
    value = packet.options[i].value

    // max option length is 1 header, 2 ext numb, 2 ext length
    buffer = Buffer.alloc(value.length + 5)

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
