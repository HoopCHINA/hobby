/* engine.js */

var events = require('events');
var util = require('util');
var crypto = require('crypto');
var request = require('request');
var CronJob = require('cron').CronJob;

var db = require('./leveldb')('task');

var tasks = {};

db.all(function (err, data) {
  if (err) throw err;
  _Merge(tasks, data);
});

exports.list = function () {
  return tasks;
};

exports.create = function (name, task_) {
  if (tasks[name]) {
    tasks[name].stop();
  }

  var task = tasks[name]
           = new Task(_Merge(task_, {name: name}));
  db.put(name, task);
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
  db.del(name);
}

function checkExists(name) {
  if (!tasks[name]) {
    throw new Error('not found');
  }  
}

// TODO: Control task auto-delete, `hour` aligned

dropTask();

function dropTask() {
  // del();
  setTimeout(dropTask, 3600*1000); // 1hr
}

// TODO: retry 3 times

/**
 * @class Task(task) : EventEmitter
 *
 * @param task {
 *    name: string,
 *    url: string,
 *    callback: string,
 *    active: bool,
 *    cron: string|epoch|{tab:string, start:epoch, end:epoch},
 *    drop: epoch,
 *    retry: int,
 *    timeout: int,
 *    urlTemplate: string,
 *    callbackTemplate: string,
 *    patches: string[],
 *    hash: string,
 *    created: epoch,
 *    updated: epoch,
 *  }
 */
function Task(task) {
  if (!(this instanceof Task)) return new Task(task);
  events.EventEmitter.call(this);

  _Merge(this, task);

  if (!this.name) throw new Error('`name` must has a value');
  if (!this.url) throw new Error('`url` must has a value');
  if (!this.hasOwnProperty('active')) this.active = true;

  // TODO Impl auto drop
  if (typeof this.cron === 'string')
    this.cron = { tab: this.cron };
  if (typeof this.cron === 'number' && this.cron < 1000000)
    this.cron += _Now();
  if (typeof this.drop === 'number' && this.drop < 1000000)
    this.drop += _Now();

  if (!Array.isArray(this.patches))
    this.patches = [this.patches];

  if (!this.created) this.created = _Now();
  if (!this.updated) this.updated = this.created;

  this._running = false;
  this._counts = { run: 0, err: 0, succ: 0 };
  this._last = { succ: null, date: null };

  this.sched();
}
// Inherits
util.inherits(Task, events.EventEmitter);
 * @proto void sched()
 */
Task.prototype.sched = function () {
  if (this._cronJob) {
    this._cronJob.stop();
    this._cronJob = null;
  }

  if (this.cron) {
    var self = this;
    var once = typeof this.cron === 'number';
    var cron = once ? new Date(this.cron*1000) : this.cron.tab;

    this._cronJob = new CronJob(cron, function () {
      if (!once)
        self.run();
      else
        self.run(function () { self.stop(); });
    });

    if (this.active)
      this._cronJob.start();
  }
};

/**
 * @proto void test(void (^cb)(err, headers, body, modified))
 */
Task.prototype.test = function (cb) {
  // TODO Retry 3 times on error
  //
  var self = this;
  var rsrc = { url: self.url };

  if (self.timeout)
    rsrc.timeout = self.timeout*1000;

  request(rsrc, function (err, res, body) {
    if (!cb) return;
    if (err || res.statusCode !== 200) {
      cb(err || _Merge(new Error(body), {code: res.statusCode}));
    } else {
      cb(err, res.headers, body, self.hash !== _Hash(res.headers, body));
    }
  });
};

/**
 * @proto bool run(void (^cb)(err, headers, body, modified))
 */
Task.prototype.run = function (cb) {
  // TODO Retry 3 times on error
  //
  if (!this._running) {
    this._running = true;
  } else {
    if (cb) cb(new Error('Already running'));
    return false;
  }

  var self = this;
  var rsrc = { url: self.url };

  if (self.timeout)
    rsrc.timeout = self.timeout*1000;

  request(rsrc, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      reqErr(err, res, body, 'fetch');
      return;
    }

    var headers = res.headers;
    var hash = _Hash(headers, body);

    // No changes
    if (self.hash === hash) {
      upd(err, res, body);
      return;
    }

    if (!self.callback) {
      succ(err, res, body, hash);
      return;
    }

    var callbk = {
      method: 'POST',
      url: self.callback,
      body: body,
      headers: {
        'date': headers['date'],
        'content-type': headers['content-type'],
      },
    };

    if (self.timeout)
      callbk.timeout = self.timeout*1000;

    request(callbk, function (err_, res_, body_) {
      if (err_ || res_.statusCode !== 200) {
        reqErr(err_, res_, body_, 'callback');
      } else {
        succ(err, res, body, hash);
      }
    });
  });

  function reqErr(err, res, body, at) {
    if (err) {
      err.at = at;
    } else {
      err = _Merge(new Error(body), {at: at, code: res.statusCode});
    }
    upd(err);
  }

  function succ(err, res, body, hash) {
    self.hash = hash;
    self._patch(res.headers, body);
    self.updated = _Now();
    upd(err, res, body, true);
  }

  function upd(err, res, body, modified) {
    self._running = false;
    self._counts.run++;
    self._counts[err?'err':'succ']++;

    self._last = {
      succ: !err,
      date: _Now(),
    };

    if (!err) {
      self._last.body = body;
    }
    else {
      self._last.err = {
        at: err.at,
        code: err.code,
        msg: err.message,
      };
    }

    if (cb) {
      if (err) {
        cb(err);
      } else {
        cb(err, res.headers, body, modified);
      }
    }
  }
};

/**
 * @proto void start()
 */
Task.prototype.start = function () {
  if (!this.active) {
    this.active = true;
    this.updated = _Now();
    if (this._cronJob) this._cronJob.start();
  }
};

/**
 * @proto void stop()
 */
Task.prototype.stop = function () {
  if (this.active) {
    this.active = false;
    this.updated = _Now();
    if (this._cronJob) this._cronJob.stop();
  }
};

/**
 * @proto string toString()
 */
Task.prototype.toString = function () {
  return "[object Task('" + this.name + "')]";
};

/**
 * @proto object toJSON()
 */
Task.prototype.toJSON = function () {
  var self = this;
  var o = {};

  ['name', 'url', 'callback', 'active', 'cron', 'drop',
   'retry', 'timeout', 'urlTemplate', 'callbackTemplate',
   'patches', 'hash', 'created', 'updated',
   '_running', '_counts', '_last'].forEach(function (k) {
    o[k] = self[k];
  });

  return o;
};

/**
 * @proto void _patch(headers, body)
 */
Task.prototype._patch = function (headers, body) {
  if (!Array.isArray(this.patches) || !this.patches.length)
    return;

  var self = this;
  var data = body;

  if (/application\/json/i.test(headers['content-type'])) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return;
    }
  }

  this.patches.forEach(function (v) {
    try {
      require('./patch/' + v)(self, data);
    } catch (e) {}
  });
};

// Helpers
function noop() {}

function _Hash(headers, body) {
  var hash = crypto.createHash('sha256');
  hash.update(headers['content-type'] || '');
  hash.update(body || '');
  return hash.digest('hex');
}

function _Merge(obj, add) {
  if (add && typeof add === 'object') {
    Object.keys(add).forEach(function (k) {
      obj[k] = add[k];
    });
  }
  return obj;
}

function _Now() {
  return ~~(Date.now() / 1000);
}
