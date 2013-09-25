/* leveldb.js */

var path = require('path');
var level = require('level');

var dir = path.join(__dirname, '../db');
var db = level(dir, {valueEncoding: 'json'});

module.exports = exports = function (ns) {
  return new LevelDB(ns);
};

/**
 * @class LevelDB(ns)
 */
function LevelDB(ns) {
  if (!(this instanceof LevelDB)) return new LevelDB(ns);
  this._ns = ns || '';
}

LevelDB.prototype.pre = function (key) {
  return this._ns + ':' + key;
};

LevelDB.prototype.unpre = function (key) {
  return key.substring(this._ns.length + 1);
}

LevelDB.prototype.put = function (key, val, cb) {
  db.put(this.pre(key), val, cb);
  return this;
};

LevelDB.prototype.get = function (key, cb) {
  db.get(this.pre(key), cb);
  return this;
};

LevelDB.prototype.del = function (key, cb) {
  db.del(this.pre(key), cb);
  return this;
};

LevelDB.prototype.all = function (cb) {
  var self = this;
  var result = {};

  db.createReadStream({start: this.pre('\0'), end: this.pre('\xff')})
    .on('data', function (data) {
      result[self.unpre(data.key)] = data.value;
    })
    .on('error', function (err) {
      if (cb) cb(err);
    })
    .on('end', function () {
      if (cb) cb(null, result);
    });
};
