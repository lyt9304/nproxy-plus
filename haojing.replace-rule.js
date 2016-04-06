// deps
var _ = require('underscore');

// util
var path = require('path');
var url = require('url');
var log = require('./lib/log');

var resSemicolon = path.join(__dirname, 'semicolon.js');
var resSocketClient = path.join(__dirname, 'socket-client.js');

// config
var env = require('./haojing.env-config.js');
var username = env.HAOJING_USERNAME;
var isLive = env.HAOJING_IS_LIVE;
var pathStatic = path.join(env.HAOJING_PATH_ROOT, env.HAOJING_PATH_STATIC);
var pathAssets = path.join(env.HAOJING_PATH_ROOT, env.HAOJING_PATH_ASSETS);
var jsComboConfig = path.join(pathAssets, env.HAOJING_JS_COMBO_CONFIG);
var stylusPath = path.join(env.HAOJING_PATH_ROOT, env.HAOJING_PATH_ASSETS, 'mobile', 'css');

// url
var hostReqStatic = 'http://s.' + username + '.baixing.cn/';
var reqWapAssets = url.resolve(hostReqStatic, 'w/');

// prepare rules
var mappingRules = [];

// wap js bundles
// [proxy] <--	http://s.{HAOJING_USERNAME}.baixing.cn/w/*.js
// [proxy] -->	{local-path-to-your}/haojing/assets/**.js + ...

/**
 {
    pattern : http://s.{HAOJING_USERNAME}.baixing.cn/w/*.js,
    responder : 'concat',
    options : {
      files: [
        path.join({path-to-haojing-assets}, 'c1.js'),
        path.join({path-to-haojing-assets}, 'c2.js'),
        ...
      ]
    }
  }
 */

var mapping = require(jsComboConfig).mobile;

// convert `mapping` to nproxy rules
_.each(mapping, function (value, key) {

  // only handle the keys containing '.js'
  if (!key || key.indexOf('.js') < 0) return;

  var rule = {};
  rule.pattern = url.resolve(reqWapAssets, key);
  rule.responder = 'concat';
  rule.options = {};

  var list = [];
  _.each(value, function (item) {
    list.push(path.join(pathAssets, item));
    // append a semicolon to each js file
    list.push(resSemicolon);
  });

  //if live-reload is on, append socket-client to lib.js
  if(isLive && key.indexOf('lib.js')!=-1){
    list.push(resSocketClient);
  }

  rule.options.files = list;

  mappingRules.push(rule);
});

 //fix baidu js
 //[proxy] <--	http://script.bd.{HAOJING_USERNAME}.baixing.cn/**.js
 //[proxy] -->	http://script.bd.baixing.net/**.js
var reqBDJS = 'http://script.bd.*.baixing.cn/**.js';
var resBDJS = 'http://script.bd.baixing.net';
var patternBDJS = reqBDJS
  .split('/').join('\\/')	// `/` -> `\/`
  .split('.').join('\\.')	// `.` -> `\.`
  .split('**').join('(.+)')
  .split('*').join('.+');
var ruleFixBDJS = {
  pattern: new RegExp(patternBDJS),
  responder: "web",
  options: {
    file: resBDJS + '/$1.js'
  }
};

// cache favicon
var reqFavicon = url.resolve(hostReqStatic, 'favicon.ico');
// use remote file because of its expiring head
var resFavicon = 'http://s.baixing.net/favicon.ico';
var ruleFavicon = {
  pattern: reqFavicon,
  responder: "web",
  options: {
    file:resFavicon
  }
};

// stylus
// [proxy] <--	http://s.{HAOJING_USERNAME}.baixing.cn/w/(.+)\.css
// [proxy] -->	http://127.0.0.1:{STYLUS_SRV_PORT}/w/$1.css
var patternWapAssets = reqWapAssets
    .split('/').join('\\/')	// `/` -> `\/`
    .split('.').join('\\.');	// `.` -> `\.`
  //+ '(.+)\.css';
var reReqWapAssets = new RegExp(patternWapAssets);
var ruleWapAssets = {
  pattern: reReqWapAssets,
  responder: "stylus",
  options:{
    file:stylusPath
  }
};

// organize rules (order matters)
mappingRules.push(ruleFixBDJS);
mappingRules.push(ruleFavicon);
mappingRules.push(ruleWapAssets);

module.exports = mappingRules;
