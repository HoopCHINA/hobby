/* index.js */

var tasks = require('./tasks');
var monit = require('./monit');

module.exports = function (server) {
  // Tasks
  server.get('/tasks', tasks.listTasks);
  server.post('/task/:name', tasks.createTask);
  server.put('/task/:name', tasks.replaceTask);
  server.get('/task/:name', tasks.getTask);
  server.get('/task/:name/test', tasks.testTask);
  server.get('/task/:name/run', tasks.runTask);
  server.get('/task/:name/run/:opt', tasks.runTask);
  server.del('/task/:name', tasks.removeTask);
  server.patch('/task/:name', tasks.patchTask);

  // Stats
  server.get('/stats', monit.stats);
};
