/* manage.js */

// Management interface

// getXXX
// getYYY
// getZZZ


function createJob() {
  var job = new Job();
  if (job.urlTemplate) {
    job = require('./patch/' + job.patch)(job, null);
  }
}
