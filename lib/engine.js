/* engine.js */

// var restify = require('restify');
// var dao;

// dao.update('', x, function () {
  // cb();
// });

var dao = require('./dao');
var Task = require('./model/task');

var tasks = {};
var dirtyTasks = {};

exports.list = function () {
  return tasks;
};

exports.create = function (name, task_) {
  if (tasks[name]) {
    tasks[name].stop();
  }

  var task = tasks[name]
           = new Task(_Merge(task_, {name: name}));
  task.sched();
  dao.save(task);
};

exports.get = function (name) {
  checkExists(name);
  return tasks[name];
}

exports.test = function (name, cb) {
  checkExists(name);
  tasks[name].test(cb);
};

exports.run = function (name, cb) {
  checkExists(name);
  tasks[name].run(cb);
}

exports.del = function (name) {
  checkExists(name);
  tasks[name].stop();
  delete tasks[name];
}

function checkExists(name) {
  if (!tasks[name]) {
    throw new Error('not found');
  }  
}


// TODO: Lazy persist, use a dirty flag and run on nextTick()

// TODO: Control task auto-delete, `hour` aligned

deleteTask();

function deleteTask() {
  // del();
  setTimeout(deleteTask, 3600*1000); // 1hr
}


// Helpers
function _Merge(obj, add) {
  if (add && typeof add === 'object') {
    Object.keys(add).forEach(function (k) {
      obj[k] = add[k];
    });
  }
  return obj;
}
