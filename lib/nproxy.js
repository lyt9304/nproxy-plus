var http = require('http');
var https = require('https');
var net = require('net');
var express = require('express');
var fs = require('fs');
var path = require('path');
var async = require('async');
var chokidar=require("chokidar");

var log = require('./log');
var utils = require('./utils');

var DEFAULT_PORT = 8989;
var INTERNAL_HTTPS_PORT = 0;
var app;
var httpServer;
var httpsServer;
var privateKeyFile = path.join(__dirname, '..', 'keys', 'privatekey.pem');
var certificateFile = path.join(__dirname, '..', 'keys', 'certificate.pem');
var env = require('../haojing.env-config.js');
var pathAssets = path.join(env.HAOJING_PATH_ROOT, env.HAOJING_PATH_ASSETS);
var stylusPath = path.join(pathAssets, 'mobile', 'css');
var jsComboConfig = path.join(pathAssets, env.HAOJING_JS_COMBO_CONFIG);
var mobileScriptMapping = require(jsComboConfig).mobile;
var rollUpMapping = {};


/**
 * Start up nproxy server on the specified port
 * and combine the processors defined as express middlewares into it.
 * 
 * @param {String} port the port proxy server will listen on
 * @param {Object} options options for the middlewares
 * TODO:live-reload
 */
function nproxy(port, options){
  var nm;

  if(typeof options.timeout === 'number'){
    utils.reqTimeout = options.timeout;
    utils.resTimeout = options.timeout;
  }

  if(typeof options.debug === 'boolean'){
    log.isDebug = options.debug;
  }

  if(typeof options.live === 'boolean' && options.live === true){
    liveReloadSocket();
  }

  nm = require('./middlewares'); //nproxy middles

  port = typeof port === 'number' ? port : DEFAULT_PORT;

  app = express();
  if(typeof options.responderListFilePath !== 'undefined'){
    app.use(nm.respond(options.responderListFilePath, options.watchPath));
  }
  app.use(nm.forward());

  httpServer = http.createServer(function(req, res){
    req.type = 'http';
    app(req, res);
  }).listen(port);
  httpsServer = https.createServer({
    key: fs.readFileSync(privateKeyFile),
    cert: fs.readFileSync(certificateFile)
  }, function(req, res){
    req.type = 'https';
    app(req, res);
  });
  httpsServer.on('listening', function(){
    INTERNAL_HTTPS_PORT = httpsServer.address().port;
  });
  httpsServer = httpsServer.listen(INTERNAL_HTTPS_PORT);

  proxyHttps();

  log.info('NProxy started on ' + port + '!');

  if (options.networks) {
    log.info('Network interfaces:');
    var interfaces = require('os').networkInterfaces();
    for (var key in interfaces) {
      log.info(key);
      interfaces[key].forEach(function (item) {
        log.info('  ' + item.address + '\t' + item.family);
      });
    }
  }

  return {
    httpServer: httpServer,
    httpsServer: httpsServer
  };
}


/**
 * Listen the CONNECTION method and forward the https request to internal https server
 */
function proxyHttps(){
  httpServer.on('connect', function(req, socket, upgradeHead){
    var netClient = net.createConnection(INTERNAL_HTTPS_PORT);

    netClient.on('connect', function(){
      log.info('connect to https server successfully!');
      socket.write( "HTTP/1.1 200 Connection established\r\nProxy-agent: Netscape-Proxy/1.1\r\n\r\n");
    });

    socket.on('data', function(chunk){
      netClient.write(chunk);
    });
    socket.on('end', function(){
      netClient.end();
    });
    socket.on('close', function(){
      netClient.end();
    });
    socket.on('error', function(err){
      log.error('socket error ' + err.message);
      netClient.end();
    });

    netClient.on('data', function(chunk){
      socket.write(chunk);
    });
    netClient.on('end', function(){
      socket.end();
    });
    netClient.on('close', function(){
      socket.end();
    });
    netClient.on('error', function(err){
      log.error('netClient error ' + err.message);
      socket.end();
    });

  });
};

function liveReloadSocket(){
  //TODO 首先port自定义,其次client在gulp的时候能不能自动替换成这个port,可以在这里替换一下路径
  //TODO client的源代码应该也要在这里建立一个子项目,方便修改编译
  var port=8990;
  var server=http.createServer(function(req,res){
    res.writeHead(200,{'Content-type':'text/plain'});
    res.end("Hello World!\n");
  });

  var io=require("socket.io")(server);

  server.listen(port, function () {
    log.info('[Socket Server] listening at port: ' + port);
  });

  io.on('connection',function(socket){

    log.info("=========in connection!=========");

    //初始化watcher文件监控器
    var watcher = chokidar.watch(stylusPath, {
      ignored: /[\/\\]\./,
      persistent: true
      //cwd:process.cwd()
    });

    //TODO 这里最好需要watch的路径能够有个配置文件,不然每次都自己手动改太麻烦了
    watcher.add([
      path.join(pathAssets, "app"),
      path.join(pathAssets, "bower_components"),
      path.resolve(pathAssets, "../view")
    ]);

    //为watcher添加add/change/unlink(remove)事件
    watcher
      //.on('add', function (file) {
      //  log.info("File:" + file + " has been added");
      //})
      .on('change', function (file) {
        log.info("File:" + file + " has been changed");

        //处理js,有两种可能一种是script-bundle,另外一种就是rollup的模块
        if(/\.js/.test(file)){
          //script-bundle
          var files = searchModifiedFile(file);
          log.debug("searchModifiedFile: " + files.toString());

          if(files && files.length){
            for (var i = 0; i < files.length; i++) {
              var obj = files[i];
              socket.emit("change",{name:obj});
            }
          }

          //TODO:rollup

        }

        //处理stylus文件
        if(/\.styl/.test(file)){
          socket.emit("change",{name:path.basename(file).replace(".styl",".css")});
        }

      });
      //.on('unlink', function (file) {
      //  log.info("File:" + file + " has been removed");
      //});

    socket.on('disconnect',function(){
      log.debug("disconnecting!");
    });
  });
}

/**
 * if some file changed, it may in the bundle of some other file,
 * use script-bundle.js to find which file is influenced.
 * @param fileName
 * @return array
 */
function searchModifiedFile(fileName){
  var res=[];
  for(var key in mobileScriptMapping){
    var list = mobileScriptMapping[key];
    for (var i = 0; i < list.length; i++) {
      var file = list[i];
      if(path.join(pathAssets, file) === fileName){
        res.push(key);
        break;
      }
    }
  }
  return res;
}

nproxy.mix = function(){
    var steps = [].slice.apply(arguments);
    return function(pattern, options, req, res, next){
        async.parallel(steps, function(err, result){
            if(err){
                res.status(500).end();
                return;
            }
            res.type('js');
            res.send(result.join(''));
        });
    };
};

nproxy.route = function(name){
    var args = [].slice.apply(arguments);
    args.shift();
    return function(callback){
        var runArgs = [callback];
        for(var i = 0, len =args.length; i < len; i++){
            runArgs.push(args[i]);
        }
        if(typeof name === 'string'){
            require('./transformers/'+name).apply(this, runArgs);
        }
        else if(typeof name === 'function'){
            name.apply(this, runArgs);
        }
    };
};

process.on('uncaughtException', function(err){
  log.error('uncaughtException: ' + err.message);
});

module.exports = nproxy;

