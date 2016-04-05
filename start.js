var nproxy = require('./');
var path = require('path');
var testReplaceListPath = path.join(__dirname, 'mytest', 'replace-list.js');
var haojingConfig = path.join(__dirname, 'haojing.env-config.js');
var haojingRule = path.join(__dirname, 'haojing.replace-rule.js');

var options = {
  timeout: 10,
  debug: true,
  //responderListFilePath: haojingRule
  responderListFilePath: haojingRule
};

var port = 8989;
nproxy(port, options );