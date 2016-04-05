var path = require('path');

var replacedDir = path.join(__dirname, 'files', 'replaced');

module.exports = [
  //css替换单个文件(a.css)
  {
    pattern : 'web/css/a.css',
    responder : 'local',
    options : {
      file: path.join(replacedDir, 'css', 'ar.css')
    }
  },

  //css文件夹替换(dir,b)
  {
    pattern : "web/css/",
    responder : 'local',
    options : {
      file: path.join(replacedDir, 'css')
    }
  },

  //pattern使用正则表达式
  {
    pattern : /web\/css\/b.*\.css/g,
    responder : 'local',
    options : {
      file: path.join(replacedDir, 'css', 'bstar.css')
    }
  },

  //替换单个网络文件
  {
    pattern : 'web/scripts/seed.js',
    responder : 'web',
    options : {
      file: 'http://g.tbcdn.cn/kissy/k/1.4.0/seed-min.js'
    }
  },

  //本地concat
  {
    pattern : 'web/scripts/concat1.js',
    responder : 'concat',
    options : {
      dir : path.join(replacedDir, 'scripts'),
      files: [
        'c1.js',
        'c2.js',
        'c3.js',
        'c1.js'
      ]
    }
  },

  //
  {
    pattern : 'web/scripts/concat2.js',
    responder : 'concat',
    options : {
      files: [
        path.join(replacedDir, 'scripts', 'c1.js'),
        path.join(replacedDir, 'scripts', 'c2.js'),
        path.join(replacedDir, 'scripts', 'c3.js'),
        path.join(replacedDir, 'scripts', 'c4.js')
      ]
    }
  },

  //webpack单个文件
  {
    pattern : 'web/script-babel/a.js',
    responder : 'babel-webpack',
    options : {
      file: path.join(replacedDir, 'babel', 'main.js')
    }
  },

  //webpack文件夹映射
  {
    pattern : 'web/script-babel/',
    responder : 'babel-webpack',
    options : {
      file: path.join(replacedDir, 'babel')
    }
  },

  //stylus单个文件
  {
    pattern : 'web/stylus-css/style.css',
    responder : 'stylus',
    options : {
      file: path.join(replacedDir, 'stylus', 'style.styl')
    }
  },

  //stylus文件夹映射
  {
    pattern : 'web/stylus-css/',
    responder : 'stylus',
    options : {
      file: path.join(replacedDir, 'stylus')
    }
  }

];