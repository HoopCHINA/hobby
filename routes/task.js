/* task.js */

// getMatches
// getXXX
// getYYY
// getZZZ


// 人工添加比赛...

var engine = require('../lib/engine');

exports.listen = function (server) {
  server.get('/tasks', listTasks);
  server.put('/task/:name', createTask);
  server.get('/task/:name/test', testTask);
};

function listTasks(req, res, next) {
  res.send(engine.list());
  return next();
}

function createTask(req, res, next) {
  var name = req.params.name;
  var task = req.body || {};

  task.name = name;

  try {
    engine.create(task);
    res.send('+OK');
  }
  catch (e) {
    res.send(422, e);
  }
}

function testTask(req, res, next) {
  var name = req.params.name;

  try {
    engine.test(name, function (err, headers, body, modified) {
      if (err) {
        res.send(typeof err === 'number' ? new Error(err) : err);
      } else {
        res.send({headers: headers, body: body, modified: modified});
      }
    });
  }
  catch (e) {
    res.send(404, e);
  }
}
