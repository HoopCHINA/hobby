/* test-clean.js */

var assert = require('assert');
var request = require('request');

var taskUrl = {
  method: 'DELETE',
  url: 'http://127.0.0.1:3000/task/g-test1',
};

request(taskUrl, function (err, res, body) {
  assert(!err, 'hobby server must ready');
  console.log('hobby server: clean test1');
});

var taskUrl2 = {
  method: 'DELETE',
  url: 'http://127.0.0.1:3000/task/g-test2',
};

request(taskUrl2, function (err, res, body) {
  assert(!err, 'hobby server must ready');
  console.log('hobby server: clean test2');
});
