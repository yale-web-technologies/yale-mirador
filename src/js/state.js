// State variables for the app, which will persist if local storgae is available.

class State {
  
  constructor() {
    this.init();
  }
  
  init() {
    this.localStorageAvailable = this.checkLocalStorage();
    this.store = {
      ANNO_CELL_FIXED: true
    };
  }
  
  get(key) {
    if (this.localStorageAvailable) {
      return localStorage.getItem(key);
    } else {
      return this.store[key];
    }
  }
  
  // Both key and value must be a string.
  set(key, value) {
    if (this.localStorageAvailable) {
      localStorage.setItem(key, value);
    }
    this.store[key] = value;
  }

  checkLocalStorage() {
    return typeof(Storage) !== 'undefined';
  }
}
  
let _instance = null;

function instance() {
  if (!_instance) {
    _instance = new State();
  }
  return _instance;
};

function getState(key) {
  return instance().get(key);
}

function setState(key, value) {
  instance().set(key, value);
}

export { getState, setState };
