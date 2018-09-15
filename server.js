'use strict'

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;


/*
|--------------------------------------------------------------------------
| Http server
|--------------------------------------------------------------------------
|
| This file bootstrap Adonisjs to start the HTTP server. You are free to
| customize the process of booting the http server.
|
| """ Loading ace commands """
|     At times you may want to load ace commands when starting the HTTP server.
|     Same can be done by chaining `loadCommands()` method after
|
| """ Preloading files """
|     Also you can preload files by calling `preLoad('path/to/file')` method.
|     Make sure to pass relative path from the project root.
*/

const { Ignitor } = require('@adonisjs/ignitor')

// if (cluster.isMaster) {
//   console.log(`Master ${process.pid} is running`);

//   // Fork workers.
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   cluster.on('exit', (worker, code, signal) => {
//     console.log(`worker ${worker.process.pid} died`);
//   });
// } else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  new Ignitor(require('@adonisjs/fold'))
    .appRoot(__dirname)
    .preLoad('start/hook.js')
    .preLoad('start/event.js')
    .fireHttpServer()
    .catch(console.error)

//   console.log(`Worker ${process.pid} started`);
// }