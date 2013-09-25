/* index.js */

var task = require('./task');

module.exports = exports = function (server) {
  // Task
  server.get('/tasks', task.listTasks);
  server.put('/task/:name', task.createTask);
  server.get('/task/:name', task.showTask);
  server.get('/task/:name/test', task.testTask);
  server.get('/task/:name/run', task.runTask);
  server.del('/task/:name', task.delTask);
  //server.post('/task/:name', task.creatTask);
  //server.patch('/task/:name', task.patchTask);
};
