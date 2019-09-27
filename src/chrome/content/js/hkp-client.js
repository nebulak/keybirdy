'use strict';

// Sample usage:
//
// This is optional, by default it will
// use http://pgp.mit.edu:11371, but you
// can use other servers:
//
// hkpClient.server = "http://pgp.mit.edu:11371";
//
// hkpClient.search("rha7.com@gmail.com")
// .done(function(records, data, textStatus, jqXHR) {
//   console.log("Search::Yeah!", records);
// })
// .fail(function(jqXHR, textStatus, errorThrown) {
//   console.log("Search::Bummer!", textStatus, errorThrown);
// })
// ;
//
// hkpClient.fetch("35F6CE83886558ABF6CE59D7AD5F669D16A76D39")
// .done(function(key, data, textStatus, jqXHR){
//   console.log("Fetch::Yeah!", key);
// })
// .fail(function(jqXHR, textStatus, errorThrown){
//   console.log("Fetch::Bummer!", textStatus, errorThrown);
// })
// ;

function parseKeyLines(data) {
  var fields, line, lines, pub, uid, info, active, inactive;
  lines = data.split('\n');
  uid = null;
  pub = null;
  info = null;
  active = [];
  inactive = [];
  while (line = lines.shift()) {
    fields = line.split(':');
    if (fields[0] === 'pub') {
      pub = {
        keyId: fields[1],
        algo: fields[2],
        bits: fields[3],
        time: fields[4],
        exp: fields[5],
        flags: fields[6]
      };
    } else if (fields[0] === 'uid') {
      uid = {
        user: fields[1],
        time: fields[2],
        exp: fields[3],
        flags: fields[4]
      };
    } else if (fields[0] === 'info') {
      info = {
        version: fields[1],
        count: fields[2]
      }
    }
    if (pub !== null && uid !== null) {
      if (pub.flags.indexOf("r") < 0 && pub.flags.indexOf("d") < 0 && pub.flags.indexOf("e") < 0) {
        active.push({
          uid: uid,
          pub: pub,
        });
      } else {
        inactive.push({
          uid: uid,
          pub: pub,
        });
      }
      uid = null;
      pub = null;
    }
  }
  return { info: info, active: active, inactive: inactive };
}

function truncateKey(data) {
  var begin, end, key, lines;
  data = data.replace(/\r/g, '');
  lines = data.split('\n');
  begin = lines.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----');
  if (begin < 0) {
    throw new Error('Unable to find beginning of public key block');
  }
  end = lines.indexOf('-----END PGP PUBLIC KEY BLOCK-----');
  if (end < 0) {
    throw new Error('Unable to find end of public key block');
  }
  key = lines.slice(begin, end + 1);
  return key.join('\n');
};

var hkpClient = {
  server: "https://keys.openpgp.org",

  search: function(str, cb){
    var options = {
      options: "mr",
      op: "search",
      search: str
    };
    var params = jQuery.param(options);
    var dfd = jQuery.Deferred();
    //console.log("Request: " + this.server+"/pks/lookup?"+params);
    jQuery.get(this.server+"/vks/v1/by-email/"+encodeURI(str))
    .done(function(data, textStatus, jqXHR){
      dfd.resolve(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown){
      dfd.reject(jqXHR, textStatus, errorThrown);
    })
    ;
    return dfd.promise();
  },

  fetch: function(keyId) {
    var options = {
      options: "mr",
      op: "get",
      search: "0x"+keyId
    };
    var params = jQuery.param(options);
    var dfd = jQuery.Deferred();

    jQuery.get(this.server+"/pks/lookup?"+params)
    .done(function(data, textStatus, jqXHR){
      try {
        var key = truncateKey(data);
        dfd.resolve(key, data, textStatus, jqXHR);
      } catch(e) {
        dfd.reject({ data: data, jqXHR: jqXHR }, "error", e);
      }
    })
    .fail(function(jqXHR, textStatus, errorThrown){
      dfd.reject(jqXHR, textStatus, errorThrown);
    })
    ;
    return dfd.promise();
  }
}

window.hkpClient = hkpClient;
