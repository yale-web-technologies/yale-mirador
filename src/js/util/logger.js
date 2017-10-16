export default function getLogger() {
  if (!instance) {
    instance = new Logger();
  }
  return instance;
}

let instance = null;

class Logger {
  constructor(logLevel) {
    this.DEBUG = 0;
    this.INFO = 1;
    this.WARNING = 2;
    this.ERROR = 3;

    this._logLevel = logLevel || this.INFO;
  }

  setLogLevel(logLevel) {
    this._logLevel = logLevel;
  }

  error(...args) {
    console.error('ERROR', ...args);
  }

  warning(...args) {
    if (this._logLevel <= this.WARNING) {
      console.warn('WARNING', ...args);
    }
  }

  info(...args) {
    if (this._logLevel <= this.INFO) {
      console.info('INFO', ...args);
    }
  }

  debug(...args) {
    if (this._logLevel <= this.DEBUG) {
      console.log('DEBUG', ...args);
    }
  }
}
