/* test-beitai_2.js */

var restify = require('restify');

var client = restify.createJsonClient({
  url: 'http://122.226.84.75:8080',
});

client.get({
    path: '/GlobalBasketBallCenter/DataInterface/LiveService/GetEventsByTopNumberOrSeqNumber?format=json&part=hupu&partkey=55044038AB7F4D4819B9A011226A0D10&random=1&scheduleID=1242751&seqNumber=0&TopNumber=20',
    headers: {'connection': 'close'},
    connectTimeout: 15,
  }, function (err, req, res, obj) {
  if (err) return;
  console.log('%j', obj['Events'].map(function (o) { return [o['SequenceNum'], o['TextualFormat']]; }));
  console.log('Max Seq: %j', Math.max.apply(null, obj['Events'].map(function (o) { return o['SequenceNum']; })));
});
