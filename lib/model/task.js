/* task.js */

/**
 * TODO Persist on 'change', not 'run'...
 */

var events = require('events');
var util = require('util');
var crypto = require('crypto');
var request = require('request');
var CronJob = require('cron').CronJob;

/**
 * @class Task(task) : EventEmitter;
 *
 * @param task {
 *    name: string,
 *    state: TaskState,
 *    url: string,
 *    callback: string,
 *    timeout: int,
 *    hash: string,
 *    urlTemplate: string,
 *    callbackTemplate: string,
 *    patches: string[],
 *    cron: string|epoch,
 *    expireAt: epoch,
 *    created: epoch,
 *    updated: epoch,
 *  }
 */
function Task(task) {
  if (!(this instanceof Task)) return new Task(task);
  events.EventEmitter.call(this);

  _Merge(this, task);

  if (!this.name) {
    throw new Error('`name` must has a value');
  }
  if (!this.state) {
    this.state = Task.ACTIVE;
  }
  if (!this.url) {
    throw new Error('`url` must has a value');
  }
  if (typeof this.patches === 'string') {
    this.patches = [this.patches];
  }

  if (typeof this.cron === 'number' && this.cron < 1000000) {
    this.cron += _Now();
  }
  if (this.expireAt && this.expireAt < 1000000) {
    this.expireAt += _Now();
  }

  if (!this.created) {
    this.created = _Now();
  }
  if (!this.updated) {
    this.updated = this.created;
  }

  this._running = false;
  this._counts = { run: 0, err: 0, succ: 0 };
  this._last = { succ: null, date: null };
}
util.inherits(Task, events.EventEmitter);
module.exports = exports = Task;

// Task state constants
Task.ACTIVE  = 0;
Task.STOPPED = 1;
Task.EXPIRED = 2;

/**
 * @proto string toString();
 */
Task.prototype.toString = function () {
  return "[object Task('" + this.name + "')]";
};

/**
 * @proto object toJSON();
 */
Task.prototype.toJSON = function () {
  var self = this;
  var o = {};

  ['name', 'state', 'url', 'callback', 'timeout', 'hash',
   'urlTemplate', 'callbackTemplate', 'patches',
   'cron', 'expireAt', 'created', 'updated',
   '_running', '_counts', '_last'].forEach(function (k) {
    o[k] = self[k];
  });

  return o;
};

/**
 * @proto void sched();
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
      self.run(function () {
        if (once) self.stop();
      });
    });

    if (this.state === Task.ACTIVE) {
      this._cronJob.start();
    }
  }
};

/**
 * @proto void test(void (^cb)(err, headers, body, modified));
 */
Task.prototype.test = function (cb) {
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
 * @proto bool run(void (^cb)(err, headers, body, modified));
 */
Task.prototype.run = function (cb) {
  if (!this._running) {
    this._running = true;
  } else {
    if (cb) cb();
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
    self.updated = _Now();
    self.emit('change');
    self._patch(res.headers, body);
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
 * @proto void active();
 */
Task.prototype.active = function () {
  if (this.state !== Task.ACTIVE) {
    this._transit(Task.ACTIVE);
    if (this._cronJob && !this._cronJob.running) this._cronJob.start();
  }
};

/**
 * @proto void stopped();
 */
Task.prototype.stop = function () {
  if (this.state !== Task.STOPPED) {
    this._transit(Task.STOPPED);
    if (this._cronJob && this._cronJob.running) this._cronJob.stop();
  }
};

/**
 * @proto void expire();
 */
Task.prototype.expire = function () {
  if (this.state !== Task.EXPIRED) {
    this._transit(Task.EXPIRED);
    if (this._cronJob && this._cronJob.running) this._cronJob.stop();
  }
};

/**
 * @proto void _transit(newState);
 */
Task.prototype._transit = function (newState) {
  this.state = newState;
  this.updated = _Now();
  this.emit('change');
};

/**
 * @proto void _patch(headers, body);
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
      require('../patch/' + v)(self, data);
    } catch (e) {}
  });

  // TODO extract updated to a function
  this.updated = _Now();
  this.emit('change');
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
