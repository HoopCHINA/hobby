/* monit.js */

var tasks = require('../lib/tasks');

exports.stats = function (req, res, next) {
  try {
    var tsks = tasks.list();
    var keys = Object.keys(tsks);
    var val = { tasks: keys.length, run: 0, err: 0, succ: 0 };

    keys.forEach(function (k) {
      var cnts = tsks[k]._counts;
      if (cnts) {
        val.run += cnts['run'] || 0;
        val.err += cnts['err'] || 0;
        val.succ += cnts['succ'] || 0;
      }
    });

    res.send(val);
  }
  catch (e) {
    // TODO use restify HttpError
    res.send(e);
  }
};
