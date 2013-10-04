
var packet   = require('./')
  , generate = packet.generate
  , parse    = packet.parse
  , expect   = require('chai').expect

describe('packet.parse', function() {
  var packet, buffer, byte

  describe('with no options', function() {

    function buildPacket(payload) {
      buffer = new Buffer(5 + payload.length)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 1 << 4 // the message is non-confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a get

      buffer.writeUInt16BE(42, 2) // the message ID

      buffer.writeUInt8(255, 4) // payload separator

      payload.copy(buffer, 5) // copy the payload
    }

    beforeEach(function() {
      buildPacket(new Buffer(0))
    })

    it('should parse the version number', function() {
      packet = parse(buffer)
      expect(packet).to.have.property('version', 1)
    })

    it('should throw if it reads version two', function() {
      buffer.writeUInt8(2 << 6, 0)
      expect(parse.bind(null, buffer)).to.throw('Unsupported version')
    })

    it('should parse the code (get)', function() {
      packet = parse(buffer)
      expect(packet).to.have.property('code', '0.01')
    })

    it('should parse the code (post)', function() {
      buffer.writeUInt8(2, 1) // it is a post

      packet = parse(buffer)
      expect(packet).to.have.property('code', '0.02')
    })

    it('should parse the code (created)', function() {
      buffer.writeUInt8(2 << 5 | 1, 1) // it is a 2.00 created

      packet = parse(buffer)
      expect(packet).to.have.property('code', '2.01')
    })

    it('should parse the code (not found)', function() {
      buffer.writeUInt8(4 << 5 | 4, 1) // it is a 4.04

      packet = parse(buffer)
      expect(packet).to.have.property('code', '4.04')
    })

    it('should parse the message id', function() {
      buffer.writeUInt16BE(42, 2)

      packet = parse(buffer)
      expect(packet).to.have.property('messageId', 42)
    })

    it('should parse the empty payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(new Buffer(0))
    })

    it('should parse some payload', function() {
      var payload = new Buffer('hello matteo')
      buildPacket(payload)
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    it('should parse some payload (bis)', function() {
      var payload = new Buffer('hello matteo')
      buildPacket(payload)
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    it('should have no options', function() {
      expect(parse(buffer).options).to.eql({})
    })

    it('should parse non-confirmable non-reset non-ack', function() {
      packet = parse(buffer)
      expect(packet).to.have.property('confirmable', false)
      expect(packet).to.have.property('reset', false)
      expect(packet).to.have.property('ack', false)
    })

    it('should parse confirmable non-reset non-ack', function() {
      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      packet = parse(buffer)
      expect(packet).to.have.property('confirmable', true)
      expect(packet).to.have.property('reset', false)
      expect(packet).to.have.property('ack', false)
    })

    it('should parse non-confirmable non-reset ack', function() {
      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 2 << 4 // the message is ack
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      packet = parse(buffer)
      expect(packet).to.have.property('confirmable', false)
      expect(packet).to.have.property('reset', false)
      expect(packet).to.have.property('ack', true)
    })

    it('should parse non-confirmable reset non-ack', function() {
      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 3 << 4 // the message is reset
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      packet = parse(buffer)
      expect(packet).to.have.property('confirmable', false)
      expect(packet).to.have.property('reset', true)
      expect(packet).to.have.property('ack', false)
    })

    it('should have a zero-length token', function() {
      packet = parse(buffer)
      expect(packet.token).to.eql(new Buffer(0))
    })
  })

  describe('with a payload and a single option with unextended number and length', function() {
    var payload = new Buffer(5)
    var optionValue = new Buffer(3)

    beforeEach(function() {
      buffer = new Buffer(6 + optionValue.length + payload.length)
      buffer.fill(0)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is non-confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a post

      buffer.writeUInt16BE(42, 2) // the message ID

      byte = 0
      byte |= 1 << 4 // the option number 1
      byte |= optionValue.length // the length is lower than 13.

      buffer.writeUInt8(byte, 4)
      optionValue.copy(buffer, 5)

      buffer.writeUInt8(255, 5 + optionValue.length) // payload separator

      payload.copy(buffer, 6 + optionValue.length) // copy the payload
    })

    it('should parse the payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    var options = {
        'If-Match': 1
      , 'Uri-Host': 3
      , ETag: 4
      , 'If-None-Match': 5
      , 'Uri-Port': 7
      , 'Location-Path': 8
      , 'Uri-Path': 11
      , 'Content-Format': 12

      // this is not specified by the protocol, 
      // but it's needed to check if it can parse
      // numbers
      , '9': 9
    }

    Object.keys(options).forEach(function(option) {
      it('should parse ' + option, function() {
        byte = 0
        byte |= options[option] << 4
        byte |= optionValue.length

        buffer.writeUInt8(byte, 4)

        packet = parse(buffer)
        expect(packet.options[option]).to.eql(optionValue)
      })
    })
  })

  describe('with a payload and a single option with one-byte extended number and unextended length', function() {
    var payload = new Buffer(5)
    var optionValue = new Buffer(3)

    beforeEach(function() {
      buffer = new Buffer(7 + optionValue.length + payload.length)
      buffer.fill(0)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is non-confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a post

      buffer.writeUInt16BE(42, 2) // the message ID

      byte = 0
      byte |= 13 << 4 // the option number is extended by one byte
      byte |= optionValue.length // the length is lower than 13.

      buffer.writeUInt8(byte, 4)
      buffer.writeUInt8(0, 5) // the one-byte extended option number
      optionValue.copy(buffer, 6)

      buffer.writeUInt8(255, 6 + optionValue.length) // payload separator

      payload.copy(buffer, 7 + optionValue.length) // copy the payload
    })

    it('should parse the payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    var options = {

        '14': 'Max-Age'
      , '15': 'Uri-Query'
      , '17': 'Accept'
      , '20': 'Location-Query'
      , '35': 'Proxy-Uri'
      , '39': 'Proxy-Scheme'
      , '60': 'Size1'

      // this is not specified by the protocol, 
      // but it's needed to check if it can parse
      // numbers
      , '16': 16
    }

    Object.keys(options).forEach(function(num) {
      var option = options[num]

      it('should parse ' + option, function() {
        buffer.writeUInt8(parseInt(num) - 13, 5)

        packet = parse(buffer)
        expect(packet.options[option]).to.eql(optionValue)
      })
    })
  })

  describe('with a payload and a single option with two-byte extended number and unextended length', function() {
    var payload = new Buffer(5)
    var optionValue = new Buffer(3)

    beforeEach(function() {
      buffer = new Buffer(8 + optionValue.length + payload.length)
      buffer.fill(0)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is non-confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a post

      buffer.writeUInt16BE(42, 2) // the message ID

      byte = 0
      byte |= 14 << 4 // the option number is extended by two bytes
      byte |= optionValue.length // the length is lower than 13.

      buffer.writeUInt8(byte, 4)
      buffer.writeUInt16BE(789 - 269, 5) // the two-byte extended option number
      optionValue.copy(buffer, 7)

      buffer.writeUInt8(255, 7 + optionValue.length) // payload separator

      payload.copy(buffer, 8 + optionValue.length) // copy the payload
    })

    it('should parse the payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    var options = [270, 678, 1024]

    options.forEach(function(num) {
      var option = parseInt(num)

      it('should parse ' + option, function() {
        buffer.writeUInt16BE(num - 269, 5)

        packet = parse(buffer)
        expect(packet.options[option]).to.eql(optionValue)
      })
    })
  })

  describe('with a payload and a single option with unextended number and one-byte extended length', function() {
    var payload = new Buffer(5)
    var optionValue = new Buffer(20)

    beforeEach(function() {
      buffer = new Buffer(7 + optionValue.length + payload.length)
      buffer.fill(0)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is non-confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a post

      buffer.writeUInt16BE(42, 2) // the message ID

      byte = 0
      byte |= 1 << 4 // the option number 1
      byte |= 13     // the option lenght is one byte more

      buffer.writeUInt8(byte, 4)
      buffer.writeUInt8(optionValue.length - 13, 5)
      optionValue.copy(buffer, 6)

      buffer.writeUInt8(255, 6 + optionValue.length) // payload separator

      payload.copy(buffer, 7 + optionValue.length) // copy the payload
    })

    it('should parse the payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    it('should parse the option value', function() {
      packet = parse(buffer)
      expect(packet.options['If-Match']).to.eql(optionValue)
    })
  })

  describe('with a payload and a single option with unextended number and two-byte extended length', function() {
    var payload = new Buffer(5)
    var optionValue = new Buffer(1024)

    beforeEach(function() {
      buffer = new Buffer(8 + optionValue.length + payload.length)
      buffer.fill(0)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is non-confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a post

      buffer.writeUInt16BE(42, 2) // the message ID

      byte = 0
      byte |= 1 << 4 // the option number 1
      byte |= 14     // the option length is two byte more

      buffer.writeUInt8(byte, 4)
      buffer.writeUInt16BE(optionValue.length - 269, 5)
      optionValue.copy(buffer, 7)

      buffer.writeUInt8(255, 7 + optionValue.length) // payload separator

      payload.copy(buffer, 8 + optionValue.length) // copy the payload
    })

    it('should parse the payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    it('should parse the option value', function() {
      packet = parse(buffer)
      expect(packet.options['If-Match']).to.eql(optionValue)
    })
  })

  describe('with a payload and a single option with both number and length extended by one byte', function() {
    var payload = new Buffer(5)
    var optionValue = new Buffer(20)

    beforeEach(function() {
      buffer = new Buffer(8 + optionValue.length + payload.length)
      buffer.fill(0)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is non-confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a post

      buffer.writeUInt16BE(42, 2) // the message ID

      byte = 0
      byte |= 13 << 4 // the number is extended by one byte
      byte |= 13      // the option lenght is one byte more

      buffer.writeUInt8(byte, 4)

      buffer.writeUInt8(42 - 13, 5) // option number is 42
      buffer.writeUInt8(optionValue.length - 13, 6)

      optionValue.copy(buffer, 7)

      buffer.writeUInt8(255, 7 + optionValue.length) // payload separator

      payload.copy(buffer, 8 + optionValue.length) // copy the payload
    })

    it('should parse the payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    it('should parse the option value', function() {
      packet = parse(buffer)
      expect(packet.options['42']).to.eql(optionValue)
    })
  })

  describe('with a payload and two unextended options', function() {
    var payload = new Buffer(5)
    var optionValue = new Buffer(3)

    beforeEach(function() {
      buffer = new Buffer(7 + optionValue.length * 2 + payload.length)
      buffer.fill(0)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is non-confirmable
      byte |= 0 // the TKL length is zero

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a post

      buffer.writeUInt16BE(42, 2) // the message ID

      byte = 0
      byte |= 1 << 4 // the option number 1
      byte |= optionValue.length // the length is lower than 13.

      buffer.writeUInt8(byte, 4)
      optionValue.copy(buffer, 5)

      byte = 0
      byte |= 2 - 1 << 4 // the option number 1
      byte |= optionValue.length // the length is lower than 13.

      buffer.writeUInt8(byte, 5 + optionValue.length)
      optionValue.copy(buffer, 6 + optionValue.length)

      buffer.writeUInt8(255, 6 + optionValue.length * 2) // payload separator

      payload.copy(buffer, 7 + optionValue.length * 2) // copy the payload
    })

    it('should parse the payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    var options = {
        'If-Match': 1
      , 'Uri-Host': 3
      , ETag: 4
      , 'If-None-Match': 5
      , 'Uri-Port': 7
      , 'Location-Path': 8
      , 'Uri-Path': 11
      , 'Content-Format': 12

      // this is not specified by the protocol, 
      // but it's needed to check if it can parse
      // numbers
      , '9': 9
    }

    Object.keys(options).forEach(function(option) {
      it('should parse ' + option, function() {
        byte = 0
        byte |= options[option] - 1 << 4
        byte |= optionValue.length

        buffer.writeUInt8(byte, 5 + optionValue.length)

        packet = parse(buffer)
        expect(packet.options[option]).to.eql(optionValue)
      })
    })
  })

  describe('with a payload an unextended option and a token', function() {
    var payload = new Buffer(5)
    var optionValue = new Buffer(3)
    var token = new Buffer(3)

    beforeEach(function() {
      buffer = new Buffer(6 + token.length + optionValue.length + payload.length)
      buffer.fill(0)

      byte = 0
      byte |= 1 << 6 // byte two bits are version
      byte |= 0 << 4 // the message is non-confirmable
      byte |= token.length // the TKL length

      buffer.writeUInt8(byte, 0)

      buffer.writeUInt8(1, 1) // it is a post

      buffer.writeUInt16BE(42, 2) // the message ID

      token.copy(buffer, 4)

      byte = 0
      byte |= 1 << 4 // the option number 1
      byte |= optionValue.length // the length is lower than 13.

      buffer.writeUInt8(byte, 4 + token.length)
      optionValue.copy(buffer, 5 + token.length)

      buffer.writeUInt8(255, 5 + token.length + optionValue.length) // payload separator

      payload.copy(buffer, 6 + token.length + optionValue.length) // copy the payload
    })

    it('should parse the payload', function() {
      packet = parse(buffer)
      expect(packet.payload).to.eql(payload)
    })

    it('should parse the token', function() {
      packet = parse(buffer)
      expect(packet.token).to.eql(token)
    })
  })
})

describe('packet.generate', function() {
  var packet, buffer, byte

  describe('with no parameters', function() {

    beforeEach(function() {
      buffer = generate()
    })

    it('should have version 1', function() {
      byte = buffer.readUInt8(0) & parseInt('11000000', 2)
      expect(byte >> 6).to.equal(1)
    })

    it('should be non confirmable', function() {
      byte = buffer.readUInt8(0) & parseInt('00110000', 2)
      expect(byte >> 4).to.equal(1)
    })

    it('should have no token length', function() {
      byte = buffer.readUInt8(0) & parseInt('00001111', 2)
      expect(byte).to.equal(0)
    })

    it('should have a message id', function() {
      byte = buffer.readUInt8(0) & parseInt('00001111', 2)
      expect(byte).to.equal(0)
    })

    it('should be a GET', function() {
      byte = buffer.readUInt8(1)
      expect(byte).to.equal(1)
    })

    it('should have a message id', function() {
      expect(buffer.readUInt16BE(2)).not.to.equal(0)
    })

    it('should have a different message id than the previous packet', function() {
      var msgId1  = buffer.readUInt16BE(2)
        , buffer2 = generate()
        , msgId2  = buffer2.readUInt16BE(2)

      expect(msgId1).not.to.eql(msgId2)
    })

    it('should have the payload separator', function() {
      expect(buffer.readUInt8(4)).to.equal(255)
    })
  })

  describe('with parameters', function() {
    var payload
      , token

    it('should generate a non-confirmable message', function() {
      buffer = generate({ confirmable: false })
      byte = buffer.readUInt8(0) & parseInt('00110000', 2)
      expect(byte >> 4).to.equal(1)
    })

    it('should generate a confirmable message', function() {
      buffer = generate({ confirmable: true })
      byte = buffer.readUInt8(0) & parseInt('00110000', 2)
      expect(byte >> 4).to.equal(0)
    })

    it('should generate an ack message', function() {
      buffer = generate({ ack: true })
      byte = buffer.readUInt8(0) & parseInt('00110000', 2)
      expect(byte >> 4).to.equal(2)
    })

    it('should generate a reset message', function() {
      buffer = generate({ reset: true })
      byte = buffer.readUInt8(0) & parseInt('00110000', 2)
      expect(byte >> 4).to.equal(3)
    })

    it('should generate a payload', function() {
      payload = new Buffer(42)
      buffer = generate({ payload: payload })
      expect(buffer.slice(5)).to.eql(payload)
    })

    it('should generate a payload', function() {
      payload = new Buffer(42)
      buffer = generate({ payload: payload })
      expect(buffer.slice(5)).to.eql(payload)
    })

    it('should use a given messageId', function() {
      buffer = generate({ messageId: 42 })
      expect(buffer.readUInt16BE(2)).to.equal(42)
    })

    it('should generate a token', function() {
      token = new Buffer(3)
      buffer = generate({ token: token })
      expect(buffer.slice(4, 7)).to.eql(token)
    })

    it('should generate the token length', function() {
      token = new Buffer(3)
      buffer = generate({ token: token })
      byte = buffer.readUInt8(0) & parseInt('00001111', 2)
      expect(byte).to.equal(3)
    })

    it('should have a maximum token length of 8', function() {
      token = new Buffer(9)
      expect(generate.bind(null, { token: token })).to.throw('Token too long')
    })

    it('should send a given code', function() {
      buffer = generate({ code: '0.02' })
      byte = buffer.readUInt8(1)
      expect(byte).to.equal(2)
    })

    var codes = {
        'GET': 1
      , 'POST': 2
      , 'PUT': 3
      , 'DELETE': 4
    }

    Object.keys(codes).forEach(function(key) {
      it('should send ' + key + ' passing the code in human format', function() {
        buffer = generate({ code: key })
        byte = buffer.readUInt8(1)
        expect(byte).to.equal(codes[key])
      })

      it('should send ' + key + ' passing the code in human format (lowercase)', function() {
        buffer = generate({ code: key.toLowerCase() })
        byte = buffer.readUInt8(1)
        expect(byte).to.equal(codes[key])
      })
    })
  })
})