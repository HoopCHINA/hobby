/* engine.js */

// var restify = require('restify');
// var dao;

// dao.update('', x, function () {
  // cb();
// });

var Task = require('./model/task');

var tasks = {};


exports.create = function (task_) {
  var task = new Task(task_);

  tasks[task.name] = task;

  task.sched();
};

exports.list = function () {
  return tasks;
};

exports.test = function (name, cb) {
  if (!tasks[name]) {
    throw new Error('not found');
  }
  tasks[name].test(cb);
};








// TODO: Lazy persist, use a dirty flag and run on nextTick()

// TODO: Control task expire

expireTask();

function expireTask() {
  // expires();
  setTimeout(expireTask, 3600*1000); // 1hr
}

