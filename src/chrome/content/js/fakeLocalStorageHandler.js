/* FakeLocalStorage needed by OpenPGP.js*/
var fakeLocalStorage = {
  _data       : {},
  setItem     : function(id, val) { return this._data[id] = String(val); },
  getItem     : function(id) { return this._data.hasOwnProperty(id) ? this._data[id] : null; },
  removeItem  : function(id) { return delete this._data[id]; },
  clear       : function() { return this._data = {}; }
};

//TODO: put credits to openpgp.js
/**
 * The class that deals with storage of the keyring.
 * Currently the only option is to use HTML5 local storage.
 * @constructor
 * @param {String} prefix prefix for itemnames in localstore
 */

function FakeLocalStore(prefix) {
  prefix = prefix || 'openpgp-';
  this.publicKeysItem = prefix + this.publicKeysItem;
  this.privateKeysItem = prefix + this.privateKeysItem;
  this.storage = fakeLocalStorage;
  /*
  if (typeof window !== 'undefined' && window.localStorage) {
    this.storage = window.localStorage;
  } else {
    this.storage = new (require('node-localstorage').LocalStorage)(config.node_store);
  }
  */
}

/*
 * Declare the localstore itemnames
 */
FakeLocalStore.prototype.publicKeysItem = 'public-keys';
FakeLocalStore.prototype.privateKeysItem = 'private-keys';
/**
 * Load the public keys from HTML5 local storage.
 * @returns {Array<module:key.Key>} array of keys retrieved from localstore
 * @async
 */
FakeLocalStore.prototype.loadPublic = async function () {
  return loadKeys(this.storage, this.publicKeysItem);
};

/**
 * Load the private keys from HTML5 local storage.
 * @returns {Array<module:key.Key>} array of keys retrieved from localstore
 * @async
 */
FakeLocalStore.prototype.loadPrivate = async function () {
  return loadKeys(this.storage, this.privateKeysItem);
};

async function loadKeys(storage, itemname) {
  const armoredKeys = JSON.parse(storage.getItem(itemname));
  const keys = [];
  if (armoredKeys !== null && armoredKeys.length !== 0) {
    let key;
    for (let i = 0; i < armoredKeys.length; i++) {
      key = await readArmored(armoredKeys[i]);
      if (!key.err) {
        keys.push(key.keys[0]);
      } else {
        util.print_debug("Error reading armored key from keyring index: " + i);
      }
    }
  }
  return keys;
}

/**
 * Saves the current state of the public keys to HTML5 local storage.
 * The key array gets stringified using JSON
 * @param {Array<module:key.Key>} keys array of keys to save in localstore
 * @async
 */
FakeLocalStore.prototype.storePublic = async function (keys) {
  await storeKeys(this.storage, this.publicKeysItem, keys);
};

/**
 * Saves the current state of the private keys to HTML5 local storage.
 * The key array gets stringified using JSON
 * @param {Array<module:key.Key>} keys array of keys to save in localstore
 * @async
 */
FakeLocalStore.prototype.storePrivate = async function (keys) {
  await storeKeys(this.storage, this.privateKeysItem, keys);
};

async function storeKeys(storage, itemname, keys) {
  if (keys.length) {
    const armoredKeys = await Promise.all(keys.map(key => stream.readToEnd(key.armor())));
    storage.setItem(itemname, JSON.stringify(armoredKeys));
  } else {
    storage.removeItem(itemname);
  }
}

//export default FakeLocalStore;
