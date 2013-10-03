 
var numMap = {
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

console.log(numMap)

var nameMap = {}

Object.keys(numMap).forEach(function (num) {
  var name = numMap[num]
  num = parseInt(num)
  nameMap[name] = num
})
