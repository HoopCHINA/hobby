var restify = require('restify');

/**
  Super-power web-page poll/watching service...
  ========
  - Management
  - Monitor
  - Scheduler
  - Persistence Jobs, Status, Logs to sqlite

  In-memory with Sqlite persistent
 */

// TODO: manual set http/https agent maxSockets to 5, for node 0.12+

// TODO: inject engine into server context
var engine = require('./lib/engine');

var server = restify.createServer({
  name: 'hobby',
  version: '0.0.1',
});

server.pre(restify.pre.sanitizePath());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.bodyParser({ mapParams: false }));

// IoC
//sched.dao = dao;

// Routes
//require('./routes/log').listen(app);
require('./routes/task').listen(server);
//require('./routes/monit').listen(app);

//app.jobs = dao.query('jobs');

var addr = process.env['HOBBY_ADDR'] || '0.0.0.0';
var port = process.env['HOBBY_PORT'] || 3000;

server.listen(port, addr, function () {
  console.log('%s listening at %s', server.name, server.url);
});

/**
  * Support `If-Modified-Since`?
  * Support crash restore...

  $res = $hobby->post('task', {
    'name' => 'g-match-1'
    'uri' => 'http://122.226.84.75:8080/GlobalBasketBallCenter/DataInterface/ScheduleService/GetDateScheduleList?format=json&part=hupu&partkey=55044038AB7F4D4819B9A011226A0D10&random=1',
    'callback' => 'http://g.hupu.com/api/beitai/',
    'period' => 100ms,
    'crontab' => '* * * * * *',
  });

  $res = $hobby->post('task', {
    'name' => 'g-match-2'
    'url' => 'http://122.226.84.75:8080/GlobalBasketBallCenter/DataInterface/ScheduleService/GetDateScheduleList?format=json&part=hupu&partkey=55044038AB7F4D4819B9A011226A0D10&random=1',
    'callback' => 'http://g.hupu.com/api/beitai/',
    'patch' => ['beitai'],
    'period' => 100ms,
  });

  $hobby->patch('task/1', {
    'callback' => '',
  });

  $hobby->patch('task/1', {
    'period' => 120
  });
 */

/**
 * get_matches();
 * get_models();
 * get__();
 * matches(...);
 * matches2.0();
 * 排行榜
 * 比赛
 */

/**
 !! Register Callback, 使用 租约 机制...

 Tips: 进程重启后，从 数据库 里 load 比赛状态数据，并 恢复状态 和 重试...
 - 更新 排行榜，更新 比赛，抓取 比赛 数据...


 - updateRank();
 - trigger();

 - matchModel::getMatchList();
 - foreach ($matches as $match) {
     getCanBUpdate();
     updateMatch();
   }

 - updateRank(); // 排行榜

 - updateMatch();

 - 取增量数据，但每 30s 取一次完整数据...
 */
