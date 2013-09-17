/* test-beitai.js */

var restify = require('restify');

var client = restify.createJsonClient({
  url: 'http://122.226.84.75:8080',
});

client.get({
    path: '/GlobalBasketBallCenter/DataInterface/ScheduleService/GetDateScheduleList?format=json&part=hupu&partkey=55044038AB7F4D4819B9A011226A0D10&random=1&leagueID=1&month=10&day=31',
    headers: {'connection': 'close'},
    connectTimeout: 15,
  }, function (err, req, res, obj) {
  if (err) return;
  console.log('%j', obj['DateScheduleList'].map(function (o) { return [o['ScheduleID'], o['StatusCNName']]; }));
});
