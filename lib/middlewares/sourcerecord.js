/**
 * Created by lyt9304 on 16/4/7.
 */

var log = require('../log');

function Record(){
  this.record = {};
}

Record.prototype.add = function(key,arr){
  this.record[key] = arr;
};

Record.prototype.getSources = function(key){
  return this.record[key];
};

Record.prototype.getRecord = function(){
  return this.record;
};

Record.prototype.findInfluencedFiles = function(fileName){
  var res = [];
  for(var key in this.record){
    var list = this.record[key];
    for (var i = 0; i < list.length; i++) {
      var obj = list[i];
      if(obj === fileName){
        res.push(key);
        break;
      }
    }
  }

  log.debug("========record::findInfluencedFiles=====" + JSON.stringify(res));
  return res;
};

var record = new Record();

module.exports = record;