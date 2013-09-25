/* task.js */

var engine = require('../lib/engine');

/**
  $hobby->patch('task/1', {
    'callback' => '',
  });

  $hobby->patch('task/1', {
    'period' => 120
  });
 */

exports.listTasks = function (req, res, next) {
  res.send(engine.list());
  return next();
}

exports.createTask = function (req, res, next) {
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

exports.showTask = function (req, res, next) {
  try {
    res.send(engine.get(req.params.name));
  }
  catch (e) {
    // TODO use Error
    res.send(404, e);
  }
}

exports.testTask = function (req, res, next) {
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

exports.runTask = function (req, res, next) {
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

exports.delTask = function (req, res, next) {
  try {
    engine.del(req.params.name);
    res.send('+OK');
  }
  catch (e) {
    res.send(e);
  }
}
