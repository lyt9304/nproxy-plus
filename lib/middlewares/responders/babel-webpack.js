var fs = require('fs');
var path = require('path');
var mime = require('mime');
var utils = require('../../utils');
var log = require('../../log');
var webpack=require('webpack');
var MemoryFS = require("memory-fs");

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

    var compilerOptions={
      entry: filePath,
      output: {
        path:'/',
        filename: 'bundle.js'
      },
      module: {
        loaders: [
          {
            test: /\.js[x]?$/,
            exclude: /node_modules/,
            loader: 'babel-loader',
            //query:{plugins: [require('babel-plugin-transform-es2015-modules-commonjs')]}
             query: {presets:["es2015"]}
          }
        ]
      }
    };

    var compiler=webpack(compilerOptions);

    var mfs=new MemoryFS();
    compiler.outputFileSystem=mfs;

    compiler.run(function(err,stats){
      if(err){
        log.error("webpack compiler error:"+err);
        return;
      }

      log.debug(stats.toJson().errors[0]);

      res.statusCode = 200;
      res.setHeader('Server', 'nproxy');

      //fs.createReadStream("/Users/lyt9304/tmp/bundle.js").pipe(res);

      var fileContent=mfs.readFileSync("/bundle.js");
      res.end(fileContent);
    })

  });
}

function respondFromWebpackAndBabel(pattern, options, req, res, next){

  log.debug("in respondFromWebpackAndBabel");
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

module.exports=respondFromWebpackAndBabel;
