var fs = require('fs');
var path = require('path');
var mime = require('mime');
var utils = require('../../utils');
var log = require('../../log');
var rollup = require('rollup').rollup;
var commonjs = require('rollup-plugin-commonjs');
var nodeResolve = require('rollup-plugin-node-resolve');

function compile(filePath, req, res, next){

  if(!utils.isAbsolutePath(filePath)){
    throw new Error('Not a valid file path');
  }

  log.debug('output file:'+filePath);

  fs.stat(filePath, function(err, stat){

    if(err){ throw err; }

    if(!stat.isFile()){
      throw new Error('The responder is not a file!');
    }

    rollup({
      entry: filePath,
      plugins: [
        nodeResolve({ jsnext: true, main: true }),
        commonjs()
      ]
    }).then(function (bundle) {
      // 输出 bundle + sourcemap
      var result = bundle.generate({
        format: 'iife',
        sourceMap: true
      });

      log.debug("result::code===>" + result.code);
      //TODO 这里为了之后的livereload的功能,还要在sourcemap上看看有没有什么可以做的
      log.debug("result::map====>" + result.map.sources.toString());

      res.statusCode = 200;
      res.setHeader('Server', 'nproxy');
      res.end(result.code);

    },function(err){
      log.error("[Rollup] Error: " + err.message);
    });
  });
}

function respondFromRollup(pattern, options, req, res, next){

  log.debug("in respondFromRollup");
  log.debug(options.file);

  var filePath = options.file;
  var url = req.url;

  if(!utils.isAbsolutePath(filePath)){
    throw new Error('Not a valid file path');
  }

  fs.stat(filePath, function(err, stat){
    if(err){
      log.error(err.message + 'for (' + url + ')' +
        ' then directly forward it!');
      res.status(500).end();
    }else{
      if(stat.isFile()){ // local file
        compile(filePath, req, res, next);
      }else if(stat.isDirectory()){ // directory mapping
        var urlWithoutQS = utils.processUrlWithQSAbandoned(url);
        var directoryPattern = url.match(pattern)[0];
        extDirectoryOfRequestUrl = urlWithoutQS.substr(
          urlWithoutQS.indexOf(directoryPattern) + directoryPattern.length);
        localDirectory = path.join(filePath,
          path.dirname(extDirectoryOfRequestUrl));

        utils.findFile(localDirectory,
          path.basename(extDirectoryOfRequestUrl),
          function(err, file){
            log.debug('Find local file: ' + file + ' for (' + url + ')');
            if(err){
              log.error(err.message + ' for (' + url + ')' +
                ' then directly forward it!');
              next();
            }else{
              compile(file, req, res, next);
            }
          });
      }
    }
  });
}

module.exports=respondFromRollup;
