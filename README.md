CoAP-Packet
=====

![Build Status](https://github.com/mcollina/coap-packet/workflows/Build%20Status/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/mcollina/coap-packet/badge.svg?branch=master)](https://coveralls.io/github/mcollina/coap-packet?branch=master)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

__CoAP-Packet__ is a generator and parser of CoAP packets for node.js.

What is CoAP?
> Constrained Application Protocol (CoAP) is a software protocol
intended to be used in very simple electronics devices that allows them
to communicate interactively over the Internet. -  Wikipedia

This library follows [RFC 7252](https://datatracker.ietf.org/doc/html/rfc7252) and [RFC 8974](https://datatracker.ietf.org/doc/html/rfc8974) for generating and parsing of CoAP packets.
It also supports the method and option codes specified by other specifications, such as [RFC 7641](https://datatracker.ietf.org/doc/html/rfc7641), [RFC 7959](https://datatracker.ietf.org/doc/html/rfc7959), and [RFC 8132](https://datatracker.ietf.org/doc/html/rfc8132).

It does not provide any CoAP semantics, it just parses the protocol.

**CoAP-packet** is an **OPEN Open Source Project**, see the <a href="#contributing">Contributing</a> section to find out what this means.

The library is being tested on Node versions 12, 14, and 16.

## Installation

```
$: npm install coap-packet --save
```

## Basic Example

The following example opens an UDP client and UDP server and sends a
CoAP message between them:

```js
const dgram = require('dgram')
const packet = require('coap-packet')
const parse = packet.parse
const generate = packet.generate
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
  token: Buffer.alloc(4),
  code: '0.01',
  messageId: 42,
  payload: Buffer.alloc(200),
  options: [{
    name: 'If-Match',
    value: Buffer.alloc(5)
  }, {
    name: 'Uri-Path',
    value: Buffer.from('hello')
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

MIT, see LICENSE.md file.
