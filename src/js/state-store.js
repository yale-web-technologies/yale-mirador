import getLogger from './util/logger';

const registeredKeys = new Set([
  'annotationBackendUrl',
  'annotationLayers',
  'copyrighted',
  'copyrightedImageServiceUrl',
  'disableAuthz',
  'fixAnnoCellHeight',
  'lastSelectedLayer',
  'layerIndexMap',
  'projectId',
  'textDirection',
  'tooltipStyles'
]);

/**
 * Holds states for the app, which will optionally persist if local storgae is
 * available.
 * The distinction of setString, setObject, setBoolean was necessary
 * because we have to assume only the "string" type is supported
 * currently for local storage on all browsers.
 */
class StateStore {
  constructor() {
    this.logger = getLogger();
    this._settings = {};
    this._localStorageAvailable = storageAvailable('localStorage');
  }

  // For values that are not persisted
  getTransient(key) {
    this._checkKey(key);
    return this._settings[key];
  }

  // For values that are not persisted
  setTransient(key, value) {
    this._checkKey(key);
    this._settings[key] = value;
  }

  getString(key) {
    this.logger.debug('StateStore#getString', key);
    this._checkKey(key);
    let value = this._settings[key];
    if (!value) {
      value = this._localStorageAvailable ? localStorage.getItem(key) : null;
      this._settings[key] = value;
    }
    return value;
  }

  setString(key, value) {
    this.logger.debug('StateStore#setString', key, value, this._localStorageAvailable);
    this._checkKey(key);
    this._settings[key] = value;
    if (this._localStorasgeAvailable) {
      localStorage.setItem(key, value);
    }
  }

  getBoolean(key) {
    return this.getString(key) === 'true';
  }

  setBoolean(key, value) {
    this.setString(key, value ? 'true' : 'false');
  }

  getObject(key) {
    this.logger.debug('StateStore#getObject', key);
    this._checkKey(key);
    const value = this.getString(key);
    return value ? JSON.parse(value) : null;
  }

  setObject(key, value) {
    this.logger.debug('StateStore#setObject', key, value);
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

export default function getStateStore(destroyOld) {
  if (!_instance || destroyOld) {
    _instance = new StateStore();
  }
  return _instance;
};
