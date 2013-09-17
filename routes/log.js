/* log.js */

/*
  require('./routes/log')(app);
 */

module.exports = exports = function (app) {
  app.get('/:id', xx);

}

function xx(req, res, next) {
  res.send('+OK');
  return next;
}

function yy() {
  ;
}
