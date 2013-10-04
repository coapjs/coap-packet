
const dgram    = require('dgram')
    , parse    = require('../').parse
    , generate = require('../').generate
    , payload  = new Buffer('Hello World')
    , message  = generate({ payload: payload })
    , port     = 41234
    , client   = dgram.createSocket("udp4")
    , server   = dgram.createSocket("udp4")

server.bind(port, function() {
  client.send(message, 0, message.length, 41234, "localhost", function(err, bytes) {
    client.close()
  })
})

server.on('message', function(data) {
  console.log(parse(data).payload.toString())
  server.close()
})
