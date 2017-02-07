const registeredKeys = new Set([
  'ANNO_CELL_FIXED',
  'lastSelectedLayer',
  'layerIndexMap'
]);

// Holds states for the app, which will persist if local storgae is available.
class StateStore {
  constructor() {
    this._settings = {};
    this._localStorageAvailable = storageAvailable('localStorage');
  }

  getString(key) {
    console.log('getString', key);
    this._checkKey(key);
    let value = this._settings[key];
    if (!value) {
      value = this._localStorageAvailable ? localStorage.getItem(key) : null;
      this._settings[key] = value;
    }
    return value;
  }

  setString(key, value) {
    console.log('setString', key, value);
    this._checkKey(key);
    console.log('State#setString key:', key, 'val:', value, 'localStorage:', this._localStorageAvailable);
    this._settings[key] = value;
    if (this._localStorageAvailable) {
      localStorage.setItem(key, value);
    }
  }

  getObject(key) {
    console.log('getObject', key);
    this._checkKey(key);
    const value = this.getString(key);
    return value ? JSON.parse(value) : null;
  }

  setObject(key, value) {
    console.log('setObject', key, value);
    this._checkKey(key);
    const stringValue = JSON.stringify(value);
    this.setString(key, stringValue);
  }

  _checkKey(key) {
    if (!registeredKeys.has(key)) {
      throw 'ERROR Invalid key for StateStore ' + key;
    }
  }
}

/**
 * param {string} type "localStorage" or "sessionStorage"
 */
function storageAvailable(type) {
  try {
    const storage = window[type],
      x = '__storage_test__';
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch(e) {
    return false;
  }
}

let _instance = null;

export default function getStateStore() {
  if (!_instance) {
    _instance = new StateStore();
  }
  return _instance;
};
