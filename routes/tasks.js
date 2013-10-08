/* tasks.js */

var tasks = require('../lib/tasks');

/**
  TODO add patch support
  $hobby->patch('task/1', {
    'callback' => '',
  });

  $hobby->patch('task/1', {
    'period' => 120
  });
 */

exports.listTasks = function (req, res, next) {
  try {
    res.send(tasks.list());
  } catch (e) {
    // TODO use restify HttpError
    res.send(e);
  }
}

exports.createTask = function (req, res, next) {
  try {
    tasks.create(req.params.name, req.body || {});
    res.send('+OK');
  }
  catch (e) {
    // TODO use restify HttpError
    res.send(422, e);
  }
}

exports.replaceTask = function (req, res, next) {
  try {
    tasks.replace(req.params.name, req.body || {});
    res.send('+OK');
  }
  catch (e) {
    // TODO use restify HttpError
    res.send(422, e);
  }
}

exports.getTask = function (req, res, next) {
  try {
    res.send(tasks.get(req.params.name));
  }
  catch (e) {
    // TODO use restify HttpError
    res.send(404, e);
  }
}

exports.testTask = function (req, res, next) {
  try {
    tasks.test(req.params.name, function (err, headers, body, modified) {
      if (err)
        res.send(err);
      else
        res.send({headers: headers, body: body, modified: modified});
    });
  }
  catch (e) {
    // TODO use restify HttpError
    res.send(404, e);
  }
}

exports.runTask = function (req, res, next) {
  try {
    tasks.run(req.params.name, function (err, headers, body, modified) {
      if (err)
        res.send(err);
      else
        res.send({headers: headers, body: body, modified: modified});
    });
  }
  catch (e) {
    // TODO use restify HttpError
    res.send(404, e);
  }
}

exports.removeTask = function (req, res, next) {
  try {
    tasks.del(req.params.name);
    res.send('+OK');
  }
  catch (e) {
    // TODO use restify HttpError
    res.send(e);
  }
}
