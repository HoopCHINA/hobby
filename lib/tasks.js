/* tasks.js */

// BUG: CHECK epoch, if 0, may means not-defined...
// BUG: turn 'cron' and others to support number string...

var events = require('events');
var util = require('util');
var crypto = require('crypto');
var request = require('request');
var CronJob = require('./cron').CronJob;
var db = require('./leveldb')('task');

var tasks = {};

// Bootstrap
exports.bootstrap = function () {
  db.all(function (err, rows) {
    if (err) throw err;

    Object.keys(rows).forEach(function (k) {
      if (rows[k].drop && rows[k].drop <= _Now()) { db.del(k); return; }
      tasks[k] = new Task(rows[k]);
      tasks[k].on('change', _onchange);
    });
  });

  (function cleanTasks() {
    Object.keys(tasks).forEach(function (k) {
      if (tasks[k].drop && tasks[k].drop <= _Now()) { _removetask(k); }
    });
    setTimeout(cleanTasks, 3600*1000); // 1hr
  })();
};

// List tasks
exports.list = function () {
  return tasks;
};

// Create task
exports.create = function (name, task) {
  if (tasks[name]) throw new Error('Alreay exist');
  _createtask(_Merge(task, {name: name}));
};

// Replace task
exports.replace = function (name, task) {
  if (tasks[name]) _removetask(name);
  _createtask(_Merge(task, {name: name}));
};

// Get
exports.get = function (name) {
  checkExists(name);
  return tasks[name];
}

// Test
exports.test = function (name, cb) {
  checkExists(name);
  tasks[name].test(cb);
};

// Run
exports.run = function (name, opt, cb) {
  checkExists(name);
  tasks[name].run(opt, cb);
}

// Delete
exports.del = function (name) {
  checkExists(name);
  _removetask(name);
}

// Helpers
function _createtask(task) {
  var task = tasks[task.name]
           = new Task(task);
  task.on('change', _onchange);
  db.put(task.name, task);
}

function _removetask(name) {
  var task = tasks[name];
  task.removeListener('change', _onchange);
  task.stop();
  delete tasks[name];
  db.del(name);
}

function _onchange() {
  var task = this;
  db.put(task.name, task);
}

function checkExists(name) {
  if (!tasks[name])
    throw new Error('not found');
}

/**
 * @class Task(task) : EventEmitter
 *
 * @param task {
 *    name: string,
 *    url: string,
 *    callback: string,
 *    active: bool,
 *    cron: string|epoch,
 *    mask: epoch|epoch[],
 *    drop: epoch,
 *    timeout: int,
 *    retry: int,
 *    force: bool,
 *    urlTemplate: string,
 *    callbackTemplate: string,
 *    patch: string|string[],
 *    hash: string,
 *    created: epoch,
 *    updated: epoch
 *  }
 */
function Task(task) {
  if (!(this instanceof Task)) return new Task(task);
  events.EventEmitter.call(this);

  _Merge(this, task);

  if (!this.name) throw new Error('`name` must has a value');
  if (!this.url) throw new Error('`url` must has a value');

  if (!this.hasOwnProperty('active')) this.active = true;
  if (!this.hasOwnProperty('timeout')) this.timeout = 15;
  if (!this.hasOwnProperty('retry')) this.retry = 1;

  if (typeof this.cron === 'number')
    this.cron = _Epoch(this.cron || 1);
  if (this.hasOwnProperty('drop'))
    this.drop = _Epoch(this.drop);
  if (typeof this.cron === 'number' && !this.hasOwnProperty('drop'))
    this.drop = this.cron + 86400; // 1d
  if (this.hasOwnProperty('mask')) {
    if (!Array.isArray(this.mask)) this.mask = [this.mask];
    this.mask[0] = _Epoch(this.mask[0]);
    this.mask[1] = _Epoch(this.mask[1]);
  }

  if (typeof this.patch === 'string') this.patch = [this.patch];

  if (!this.created) this.created = _Now();
  if (!this.updated) this.updated = this.created;

  this._running = false;
  this._counts = {run: 0, err: 0, succ: 0};
  this._last = {succ: null, date: null};

  this.sched();
}
// Inherits
util.inherits(Task, events.EventEmitter);

/**
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
    var cron = once ? new Date(this.cron*1000) : this.cron;

    this._cronJob = new CronJob(cron, function () {
      if (Array.isArray(self.mask)) {
        if (self.mask[0] && _Now() < self.mask[0]) return;
        if (self.mask[1] && _Now() >= self.mask[1]) return;
      }
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
  var self = this;
  var req = {url: self.url};

  if (self.timeout)
    req.timeout = self.timeout*1000;

  _Request(req, self.retry, function (err, res, body) {
    if (!cb) return;
    if (err || res.statusCode !== 200) {
      cb(err || _Merge(new Error(body), {code: res.statusCode}));
    } else {
      cb(err, res.headers, body, self.hash !== _Hash(res.headers, body));
    }
  });
};

/**
 * @proto bool run(opt, void (^cb)(err, headers, body, modified))
 */
Task.prototype.run = function (opt, cb) {
  // `Opt` is optional
  if (typeof opt === 'function') {
    cb = opt;
    opt = null;
  }

  if (!this._running) {
    this._running = true;
  } else {
    if (cb) cb(new Error('Already running'));
    return false;
  }

  var self = this;
  var ctx = {url: this.url, callback: this.callback, timeout: this.timeout, retry: this.retry, force: this.force};

  _Merge(ctx, opt);

  // Request
  var req = {url: ctx.url};

  if (ctx.timeout)
    req.timeout = ctx.timeout*1000;

  _Request(req, ctx.retry, function (err, res, body) {
    if (err || res.statusCode !== 200) {
      reqErr(err, res, body, 'fetch');
      return;
    }

    var headers = res.headers;
    var hash = _Hash(headers, body);

    // Not Modified
    if (!ctx.force && self.hash === hash) {
      upd(err, res, body);
      return;
    }

    if (!ctx.callback) {
      succ(err, res, body, hash);
      return;
    }

    // Callback
    var post = {
      method: 'POST',
      url: ctx.callback,
      body: body,
      headers: {
        'date': headers['date'],
        'content-type': headers['content-type'],
      },
    };

    if (ctx.timeout)
      post.timeout = ctx.timeout*1000;

    _Request(post, ctx.retry, function (err_, res_, body_) {
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
    self.emit('change');
    upd(err, res, body, true);
  }

  function upd(err, res, body, modified) {
    self._running = false;
    self._counts.run++;
    self._counts[err?'err':'succ']++;

    var last = self._last = {
      succ: !err,
      date: _Now(),
    };

    if (err)
      last.err = {at: err.at, code: err.code, msg: err.message};
    else
      last.body = body;

    if (!cb) return;
    if (err) {
      cb(err);
    } else {
      cb(err, res.headers, body, modified);
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
    this.emit('change');
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
    this.emit('change');
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

  ['name', 'url', 'callback', 'active', 'cron', 'mask', 'drop',
   'timeout', 'retry', 'force', 'urlTemplate', 'callbackTemplate',
   'patch', 'hash', 'created', 'updated',
   '_running', '_counts', '_last'].forEach(function (k) {
    o[k] = self[k];
  });
  return o;
};

/**
 * @proto void _patch(headers, body)
 */
Task.prototype._patch = function (headers, body) {
  if (!Array.isArray(this.patch)
      || !this.patch.length) return;

  var self = this;
  var data = body;

  if (/application\/json/i.test(headers['content-type'])) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return;
    }
  }

  this.patch.forEach(function (v) {
    try {
      require('./patch/' + v)(self, data);
    } catch (e) {}
  });
};

// Helpers
function noop() {}

function _Request(uri, retries, cb) {
  retries = retries || 0;
  req();

  function req() {
    request(uri, function (err, res, body) {
      if ((err || res.statusCode !== 200) && retries > 0) return retry();
      if (cb) return cb(err, res, body);
    });
  }

  function retry() {
    retries--;
    setTimeout(req, 1000);
  }
}

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

function _Epoch(epo) {
  var epo = Number(epo);
  if (!isNaN(epo)) return (epo < 1000000) ? (epo + _Now()) : epo;
}
