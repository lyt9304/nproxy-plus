var fs =require('fs');
var path = require('path');
var mime =require('mime');
var utils = require('../../utils');
var log = require('../../log');
var stylus = require('stylus');
var nib = require('nib');

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

    var str=require('fs').readFileSync(filePath,'utf8');

    stylus(str)
      .set('filename', 'haha.css')
      .set('force', true)
      .set('compress', false)
      .use(nib())
      .render(function(err,css){
        if(err){
          throw new Error('Stylus Render failed');
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', mime.lookup(filePath));
        res.write(css);
        res.end();
      })
  });
}


function respondFromLocalStylusFile(pattern, options, req, res, next){
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

        extDirectoryOfRequestUrl=extDirectoryOfRequestUrl.replace(/\.css/,".styl");

        log.debug("extDirectoryOfRequestUrl:"+extDirectoryOfRequestUrl);

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



module.exports = respondFromLocalStylusFile;