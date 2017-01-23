import {annoUtil} from '../import';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';

let instance = null;

export default function getUserSettings() {
  if (!instance) {
    instance = new UserSettings();
  }
  return instance;
};

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

class UserSettings {
  constructor() {
    this._settings = {};
    this._localStorageAvailable = storageAvailable('localStorage');
  }

  /**
   * @returns {object} a Promise
   */
  get(key) {
    const value = this._settings[key];
    return value || (this._localStorageAvailable ? localStorage.getItem(key) : null);
  }

  set(key, value) {
    console.log('UserSettings#set key:', key, 'val:', value, 'localStorage:', this._localStorageAvailable);
    this._settings[key] = value;
    if (this._localStorageAvailable) {
      localStorage.setItem(key, value);
    }
  }
}
