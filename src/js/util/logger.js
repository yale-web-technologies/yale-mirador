export default function getLogger() {
  if (!instance) {
    instance = new Logger();
  }
  return instance;
}

let instance = null;

class Logger {
  constructor(logLevel, trace) {
    this.DEBUG = 0;
    this.INFO = 1;
    this.WARNING = 2;
    this.ERROR = 3;

    this._logLevel = logLevel || this.INFO;
    this._trace = trace || false;
  }

  setLogLevel(logLevel) {
    this._logLevel = logLevel;
  }

  log() {
    if (this._trace) {
      console.trace.apply(console, arguments);
    } else {
      console.log.apply(console, arguments);
    }
  }

  error() {
    let args = Array.prototype.slice.call(arguments);
    args.unshift('ERROR');
    this.log.apply(this, args);
  }

  warning() {
    if (this._logLevel <= this.WARNING) {
      let args = Array.prototype.slice.call(arguments);
      args.unshift('WARNING');
      this.log.apply(this, args);
    }
  }

  info() {
    if (this._logLevel <= this.INFO) {
      let args = Array.prototype.slice.call(arguments);
      args.unshift('INFO');
      this.log.apply(this, args);
    }
  }

  debug() {
    if (this._logLevel <= this.DEBUG) {
      let args = Array.prototype.slice.call(arguments);
      args.unshift('DEBUG');
      this.log.apply(this, args);
    }
  }
}
