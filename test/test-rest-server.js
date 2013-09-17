var assert = require('assert');
var restify = require('restify');
var request = require('request');

var server = restify.createServer({
  name: 'hobby-test',
  version: '0.0.1',
});

server.pre(restify.pre.sanitizePath());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.bodyParser({ mapParams: false }));

var counts = 0;
setInterval(function () { counts++; }, 5000);

server.get('/url', function (req, res, next) {
  res.send([counts]);
});

server.post('/callback', function (req, res, next) {
  console.log(req.body);
  res.send('+OK');
});

server.listen(3001, '127.0.0.1', function () {
  console.log('%s listening at %s', server.name, server.url);
});

var hobby = require('../server');

setTimeout(function () {
  var taskUrl = {
    method: 'PUT',
    url: 'http://127.0.0.1:3000/task/g-test1',
    body: JSON.stringify(require('./test-g-test1.json')),
    headers: {
      'content-type': 'application/json',
    },
  };

  request(taskUrl, function (err, res, body) {
    assert(!err, 'hobby server must ready');
    console.log('hobby server: test1 %j', body);
  });

  var taskUrl2 = {
    method: 'PUT',
    url: 'http://127.0.0.1:3000/task/g-test2',
    body: JSON.stringify(require('./test-g-test2.json')),
    headers: {
      'content-type': 'application/json',
    },
  };

  request(taskUrl2, function (err, res, body) {
    assert(!err, 'hobby server must ready');
    console.log('hobby server: test2 %j', body);
  });
}, 1000);
