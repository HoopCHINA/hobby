/* task.js */

var engine = require('../lib/engine');

exports.listen = function (server) {
  server.get('/tasks', listTasks);
  server.put('/task/:name', createTask);
  server.get('/task/:name', showTask);
  server.get('/task/:name/test', testTask);
  server.get('/task/:name/run', runTask);
  server.del('/task/:name', delTask);
};

function listTasks(req, res, next) {
  res.send(engine.list());
  return next();
}

function createTask(req, res, next) {
  var name = req.params.name;
  var task = req.body || {};

  try {
    engine.create(name, task);
    res.send('+OK');
  }
  catch (e) {
    // TODO use restify HttpError
    res.send(422, e);
  }
}

function showTask(req, res, next) {
  try {
    res.send(engine.get(req.params.name));
  }
  catch (e) {
    // TODO use Error
    res.send(404, e);
  }
}

function testTask(req, res, next) {
  try {
    engine.test(req.params.name, function (err, headers, body, modified) {
      if (err)
        res.send(err);
      else
        res.send({headers: headers, body: body, modified: modified});
    });
  }
  catch (e) {
    // TODO use Error
    res.send(404, e);
  }
}

function runTask(req, res, next) {
  try {
    engine.run(req.params.name, function (err, headers, body, modified) {
      if (err)
        res.send(err);
      else
        res.send({headers: headers, body: body, modified: modified});
    });
  }
  catch (e) {
    // TODO use Error
    res.send(404, e);
  }
}

function delTask(req, res, next) {
  try {
    engine.del(req.params.name);
    res.send('+OK');
  }
  catch (e) {
    res.send(e);
  }
}
