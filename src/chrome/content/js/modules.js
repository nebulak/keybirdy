
//parallel requests
/*
var KeyFetcher = {
  keys: [],
  fetchMultiple: function (urls) {
    let requests = [];
    for(let i = 0; i < urls.length; i++) {
      requests.push($.get(urls[i]));
    }
    $.when.apply(null, requests).then(function () {
      $.each(arguments, function(i, row) {
        let status = row[1];
        let data = row[0];
        let keyInfo;
        if(status === 'success')
        {

        }
      })
    });
  }
}
*/

var KeyInfo = function(_email, _isInKeyring, _isImportable, _source) {
  this.email = _email;
  this.isInKeyring = _isInKeyring;
  this.isImportable = _isImportable;
  this.source = _source;
};

/* Globally accessible OpenPGP.Keyring instance */
//var openpgp = window.openpgp;
var Keyring;
//TODO: overwrite StoreHandler, see: https://openpgpjs.org/openpgpjs/doc/module-keyring_keyring-Keyring.html
// --> implement fakeLocalStorage with that interface
if(typeof window === "undefined") {
  Keyring = new openpgp.Keyring(/*FakeLocalStore*/);
  Keyring.load();
}
else {
  Keyring = new window.openpgp.Keyring(/*FakeLocalStore*/);
  Keyring.load();
}

/**
 *  Module containing functions for IPC with GnuPG
 * @module GPGIPC
 */
var GPGIPC = {
  gpgPath: '/usr/bin/gpg2',
  /**
   * Fetchs the Public Keyring from GnuPG as armored string
   * @function
   * @memberof module:GPGIPC
   * @param {function} callback callback function which is called with the public keyring
   * @return {string} Armored public keyring as string
   */
  getPubRingArmored: function(callback) {
    Logger.debug("GPGIPC.getPubRingArmored");
    var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    Cu.import("chrome://keybirdy/content/js/subprocess.jsm");
    var subProcStdOut = "";
    var subProcCommand = GPGIPC.gpgPath;
    var subProcArgs = ['--export', '--armor'];
    var subProcOptions = {
      command: subProcCommand,
      arguments: subProcArgs,
      stdout: function(data) {
        subProcStdOut += data;
      },
      done: function(result) {
        callback(subProcStdOut);
      }
    };
    subprocess.call(subProcOptions).wait();
  },
  /**
   * Imports an armored public pgp-key to GnuPG
   * @function
   * @memberof module:GPGIPC
   * @param {string} sKey - Armored public pgp-key to import
   * @param {function} callback callback function, which is called after the import finished
   */
  importKey: function (sKey, callback) {
    Logger.debug("GPGIPC.importKey");
    //TODO: create temporary file and copy gpgKey to it
    Components.utils.import("resource://gre/modules/osfile.jsm");
    //TODO:
    //get path for temporary file
    var filePath = OS.Path.join(OS.Constants.Path.profileDir, "tmp_gpg_key.txt");
    var tmpFile = OS.Path.join(OS.Constants.Path.profileDir, "tmp_buffer.txt");

    var encoder = new TextEncoder();
    var txtArray = encoder.encode(sKey);
    var promise = OS.File.writeAtomic(filePath, txtArray, {tmpPath: tmpFile});

    //TODO: try-catch
    promise.then(
      function() {
        CommonUtils.getGPGPath(function (gpgPath) {
          var subProcStdOut = "";
          var subProcCommand = gpgPath;
          var subProcArgs = ['--import', filePath];
          var subProcOptions = {
            command: subProcCommand,
            arguments: subProcArgs,
            stdout: function(data) {
              subProcStdOut += data;
            },
            done: function(result) {
              Logger.trace("GPGIPC.importKey: GPG returned: " + subProcStdOut);
              var removeFilePromise = OS.File.remove(filePath, {ignoreAbsent: true});
              removeFilePromise.then(function () {
                Logger.trace("GPGIPC.importKey: remove temp file was successful");
                callback(subProcStdOut);
              },
              function() {
                Logger.warn("GPGIPC.importKey: remove temp file failed");
                //TODO:
              }
            );

            }
          };
          subprocess.call(subProcOptions).wait();
        });
      },
      function(aRejectReason) {
        //TODO: throw exception
        Logger.warn("GPGIPC.importKey: creation of temp file failed with the following reason: " + aRejectReason);
      }
    );
  },
  /**
   * Deletes an armored public pgp-key from GnuPG keystore
   * @function
   * @memberof module:GPGIPC
   * @param {string} keyIdentifier - KeyIdentifier of the key e.g. "Hans Mustermann <hans.mustermann@mustermann.de>"
   * @param {function} callback callback function, which is called after the deletion
   */
  deleteKey: function (keyIdentifier, callback) {
    Logger.debug("GPGIPC.deleteKey");
    CommonUtils.getGPGPath(function (gpgPath) {
      var subProcStdOut = "";
      var subProcCommand = gpgPath;
      var subProcArgs = ['--batch', '--yes', '--delete-key', keyIdentifier];
      var subProcOptions = {
        command: subProcCommand,
        arguments: subProcArgs,
        stdout: function(data) {
          subProcStdOut += data;
        },
        done: function(result) {
          callback(subProcStdOut);
        }
      };
      subprocess.call(subProcOptions).wait();
    });
  }
};

/**
 *  Module containing functions to interact with keys
 * @module KeyManager
 */
var KeyManager = {
  init: function () {
    var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    /*var Application = Cc["@mozilla.org/steel/application;1"]
                    .getService(Ci.steelIApplication);
                    */
    this.getAllPublicKeys();
    //TODO: callback?
  },
  keyring: {},
  /**
   * Imports all public keys from GnuPG to the OpenPGP.js keyring
   * @function
   * @memberof module:KeyManager
   */
  getAllPublicKeys: function () {
    Logger.debug("KeyManager.getAllPublicKeys");
    var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    GPGIPC.getPubRingArmored(function (gpgKeys) {
      Logger.trace("KeyManager.getAllPublicKeys: getPubRingArmored finished");
      //important
      //openpgp.key.readArmored(gpgKeys).then(function(result) {
        /*
        for(let k = 0; k < result.length; k++)
        {*/
          Keyring.publicKeys.importKey(gpgKeys);
        //}
        Logger.trace("KeyManager.getAllPublicKeys: Armored keys: " + gpgKeys);
        return;
      //});

    });
  },
  /**
   * Checks if a public pgp key is available for an email address
   * @function
   * @memberof module:KeyManager
   * @param {string} email
   * @return {bool} true, if public pgp key is available for mail address
   */
  isPubKeyAvailable: function (email) {
    Logger.debug("KeyManager.isPubKeyAvailable");
    this.getAllPublicKeys();
    console.log(Keyring.publicKeys);
    var keys = Keyring.publicKeys.getForAddress(email);
    if(keys.length === 0) {
      return false;
    }
    return true;
  },

  getPublicKeys: function (email) {
	  Logger.debug("KeyManager.getPublicKey");
	  this.getAllPublicKeys();
	  var keys = Keyring.publicKeys.getForAddress(email);

	  return keys;
  },

  /**
   * Checks if public pgp keys are available for multiple mail addresses
   * @function
   * @memberof module:KeyManager
   * @param {Array} Array of email addresses
   * @return {Array} Array of email addresses for which keys are available
   */
  checkAddressesForKeys: function (emails) {
    Logger.debug("KeyManager.checkAddressesForKeys");
    //TODO:
    var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    var emailsWithKey = [];
    for(var i=0; i<emails.length; i++) {
      if(this.isPubKeyAvailable(emails[i]))
      {
        emailsWithKey.push(emails[i]);
      }
    }
    return emailsWithKey;
  },
  /**
   * Collects all keys and accounts and returns an object with AccountKeyInfos
   * @function
   * @memberof module:KeyManager
   * @return {object} Object which contains an Array of AccountKeyInfo in "object.accounts"
   */
  getAccountKeyInfos: function () {
    Logger.debug("KeyManager.getAccountKeyInfos");
    var mailAccounts = AccountManager.getAccounts();
    var accountsWithPGPKeys = KeyManager.checkAddressesForKeys(mailAccounts);

    var accountKeyInfos = [];
    for (var i= 0; i < accountsWithPGPKeys.length; i++) {
      var pgpKeys = Keyring.publicKeys.getForAddress(accountsWithPGPKeys[i]);
      if(pgpKeys.length === 0) {
        //TODO: return error / exception
      }
      //TODO: check VVV status
      var keyInfoPGP = new KeyInfo(pgpKeys[0].getExpirationTime(), pgpKeys[0].primaryKey.getKeyId().toHex(), pgpKeys[0].primaryKey.getFingerprint(), false);
      var keyInfoSMIME = null;////TODO: new KeyInfo("", key_id, fingerprint, vvvregistered);
      var accountKeyInfo = new AccountKeyInfo(accountsWithPGPKeys[i], true, keyInfoPGP, false, keyInfoSMIME);
      accountKeyInfos.push(accountKeyInfo);

    }
    var returnObject = {
      accounts: accountKeyInfos
    };
    return returnObject;
  }
};

/**
 *  Module containing helper functions and utilities
 * @module CommonUtils
 */
var CommonUtils = {
  /**
   * Returns the OS as string, e.g. "WINNT" for "Windows", complete list at https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions/OS_TARGET
   * @function
   * @memberof module:CommonUtils
   * @return {string} OS as string
   */
  getOS: function () {
    Logger.debug("CommonUtils.getOS");
    var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    var xulRuntime = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);
    return xulRuntime.OS;
  },
  /**
   * Returns the path for the GnuPG executable
   * @function
   * @memberof module:CommonUtils
   * @return {string} GnuPG path as string
   */
  getGPGPath: function (callback) {
    Logger.debug("CommonUtils.getGPGPath");
    //TODO: check for different linux paths
    var gpgPath = '/usr/bin/gpg2';
    if(CommonUtils.getOS() == "WINNT")
    {
      CommonUtils.getWinGpgPath(function(returnedPath) {
        callback(returnedPath);
      });
    }
    else {
      callback(gpgPath);
    }
  },
  /**
   * Returns the path of the GnuPG executable on windows machines
   * @function
   * @memberof module:CommonUtils
   * @param {function} callback callback function which is called with the returned string
   * @return {string} path to GnuPG executable
   */
  getWinGpgPath: function (callback) {
    //TODO: should be private
    Logger.debug("CommonUtils.getWinGPGPath");
    var { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    var Application = Cc["@mozilla.org/steel/application;1"]
                    .getService(Ci.steelIApplication);
    var subProcStdOut = "";
    Application.console.log("Z356: Entered getWinGpgPath");
    var subProcCommand = this.chrome2FilePath("chrome://vvv-addon/content/native/win/WinGetEnv.exe");
    Application.console.log("FilePath: " + subProcCommand);
    var subProcArgs = [];
    var subProcOptions = {
      command: subProcCommand,
      arguments: subProcArgs,
      stdout: function(data) {
        subProcStdOut += data;
      },
      done: function(result) {
        //TODO: delete ...
        Application.console.log("StdOut: " + subProcStdOut);
        subProcStdOut = subProcStdOut.toLowerCase();
        var PATHArray = subProcStdOut.split(";");

        for(var i = 0; i < PATHArray.length; i++) {
          if(PATHArray[i].indexOf("gnupg") !== -1) {
            //Application.console.log("GPG Path: " + PATHArray[i]);
            var gpgPath = PATHArray[i] + "\\gpg.exe";
            Application.console.log("Callback: " + gpgPath);
            callback(gpgPath);
          }
        }
        //TODO: no GPG found
        //callback("Z672: No GPGPath");
      }
    };
    subprocess.call(subProcOptions).wait();
  },
  /**
   * Returns a file path for a given chrome path e.g. chrome://vvv-addon/content/native/WinGetEnv.exe
   * @function
   * @memberof module:CommonUtils
   * @param {string} chromePath chrome path to the file
   * @return {string} file path for the given chrome path
   */
  chrome2FilePath: function (chromePath) {
    Logger.debug("CommonUtils.chrome2FilePath");
    Components.utils.import("resource://gre/modules/Services.jsm");
    var cr = Components.classes['@mozilla.org/chrome/chrome-registry;1'].getService(Components.interfaces.nsIChromeRegistry);
    var chromeURI = Services.io.newURI(chromePath, 'UTF-8', null);
    var localFile = cr.convertChromeURL(chromeURI); //TODO: delete example comments
    var filePath = localFile.path; // "file:///C:/Users/Vayeate/AppData/Roaming/Mozilla/Firefox/Profiles/aecgxse.Unnamed%20Profile%201/extensions/youraddon@jetpack.xpi!/mySubFolder/myCFunctionsForUnix.so"
    var returnPath = filePath;//TODO: //filePath.substring(8);
    if(CommonUtils.getOS() !== "WINNT") {
      return returnPath;
    }
    if(returnPath[0] === '/')
    {
      returnPath = filePath.substring(1);
      returnPath = returnPath.replace(/\//g, "\\");
    }
    return returnPath;
  },
  hexToByte: function(str) {
    //TODO:
    /*
    if (!str) {
      return new Uint8Array();
    }
*/
    var a = [];
    for (var i = 0, len = str.length; i < len; i+=2) {
      a.push(parseInt(str.substr(i,2),16));
    }

    return new Uint8Array(a);
  },
  byteArrayToB64: function(byteArray) {
    return btoa(String.fromCharCode.apply(null, byteArray));
  },
  hexToBase64: function(hexstring) {
    var b64 = btoa(String.fromCharCode.apply(null,
                hexstring.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
              );
    Application.console.log("Base64: " + b64);
    return b64;
  }
};
