var nproxy = require('./');
var path = require('path');
var replaceListPath = path.join(__dirname, 'mytest', 'replace-list.js');

var options = {
  timeout: 10,
  debug: true,
  responderListFilePath: replaceListPath
};

var port = 8989;
nproxy(port, options );