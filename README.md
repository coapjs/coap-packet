CoAP-Packet
=====

[![Build
Status](https://travis-ci.org/mcollina/coap-packet.png)](https://travis-ci.org/mcollina/coap-packet)

__CoAP-Packet__ is an _highly experimental_ generator and parser of CoAP
packets.

What is CoAP?
> Constrained Application Protocol (CoAP) is a software protocol
intended to be used in very simple electronics devices that allows them
to communicate interactively over the Internet. -  Wikipedia

This library follows the
[draft-18](http://tools.ietf.org/html/draft-ietf-core-coap-18) of the standard.

It does not provide any CoAP semantics, it just parses the protocol.

**CoAP-packet** is an **OPEN Open Source Project**, see the <a href="#contributing">Contributing</a> section to find out what this means.

This has been tested only on node v0.10.

## Installation

```
$: npm install coap-packet --save
```

## Basic Example

The following example opens an UDP client and UDP server and sends a
CoAP message between them:

```
const dgram       = require('dgram')
    , coapPacket  = require('coap-packet')
    , parse       = packet.parse
    , generate    = packet.generate
    , payload     = new Buffer('Hello World')
    , message     = generate({ payload: payload })
    , port        = 41234
    , client      = dgram.createSocket("udp4")
    , server      = dgram.createSocket("udp4")

server.bind(port, function() {
  client.send(message, 0, message.length, 41234, "localhost", function(err, bytes) {
    client.close()
  })
})

server.on('message', function(data) {
  console.log(parse(data).payload.toString())
  server.close()
})
```

## API

  * <a href="#format">JS packet format</a>
  * <a href="#parse"><code>coapPacket.<b>parse()</b></code></a>
  * <a href="#generate"><code>coapPacket.<b>generate()</b></code></a>

<a name="parse"></a>
### parse(buffer)

The `parse` function takes a buffer and returns a JS object that
follows a particular <a href="#format">format</a>.

<a name="generate"></a>
### generate()

The `generate` function takes a JS object that
follows a particular <a href="#format">format</a> and transform it into
a CoAP packet.

<a name="format"></a>
### JS packet format

The JS representation of a CoAP packet is:
```js
{
    token: new Buffer(4)
  , code: '0.01'
  , messageId: 42
  , payload: new Buffer(200)
  , options: [{
        name: 'If-Match'
      , value: new Buffer(5)
    }, {
        name: 'Uri-Path' 
      , value: new Buffer('hello')
    }]
}
```

Instead of numerical codes, it also supports humanized names, e.g.
`GET`, `POST`, `PUT`, `DELETE`.

Numerical codes can also be specified in HTTP format, like `500` or
`'404'`.

<a name="contributing"></a>
## Contributing

__CoAP-Packet__ is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [CONTRIBUTING.md](https://github.com/mcollina/coap-packet/blob/master/CONTRIBUTING.md) file for more details.

## Contributors

Coap-Packet is only possible due to the excellent work of the following contributors:

<table><tbody>
<tr><th align="left">Matteo Collina</th><td><a href="https://github.com/mcollina">GitHub/mcollina</a></td><td><a href="https://twitter.com/matteocollina">Twitter/@matteocollina</a></td></tr>
</tbody></table>

## LICENSE
Copyright (c) 2013 CoAP-Packet contributors (listed above).

Coap-Packet is licensed under an MIT +no-false-attribs license.
All rights not explicitly granted in the MIT license are reserved.
See the included LICENSE file for more details.
