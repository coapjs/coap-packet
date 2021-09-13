
const dgram = require('dgram')
const parse = require('../').parse
const generate = require('../').generate
const payload = Buffer.from('Hello World')
const message = generate({ payload: payload })
const port = 41234
const client = dgram.createSocket('udp4')
const server = dgram.createSocket('udp4')

server.bind(port, function () {
  client.send(message, 0, message.length, 41234, 'localhost', function (err, bytes) {
    if (err) {
      console.error(err.message)
    }
    client.close()
  })
})

server.on('message', function (data) {
  console.log(parse(data).payload.toString())
  server.close()
})
