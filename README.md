Hobby Server
============

Hobby Server, super power web-page poll/watching service...

- Management
- Monitor
- Scheduler
- Persistence Tasks, Apps to LevelDB

Usage
------------

* Create a task named `test1`, which will send a request to `url` every 6 seconds

  > param `name` & `url` are required

  ```
  POST http://localhost:3000/task/test1

  With params:
  {
    "url": "http://127.0.0.1:3001/url",
    "cron": "*/6 * * * * *"
  }
  ```

* List detail info of task `test1`

  `GET http://localhost:3000/task/test1`

* List all the tasks info

  `GET http://localhost:3000/tasks`

* Delete a task named `test1`

  `DELETE http://localhost:3000/task/test1`
