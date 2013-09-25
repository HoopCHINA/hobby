var restify = require('restify');

// TODO: manual set http/https agent maxSockets to 5, for node 0.12+

var addr = process.env['HOBBY_ADDR'] || '0.0.0.0';
var port = process.env['HOBBY_PORT'] || 3000;

var server = restify.createServer({
  name: 'hobby',
  version: '0.0.1',
});

server.pre(restify.pre.sanitizePath());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.bodyParser({ mapParams: false }));

// Routes
require('./routes')(server);

server.listen(port, addr, function () {
  console.log('%s listening at %s', server.name, server.url);
});
