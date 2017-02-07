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
    this.ERROR = 2;

    this.logLevel = logLevel || this.INFO;
    this.trace = trace || false;
  }

  setLogLevel(logLevel) {
    this.logLevel = logLevel;
  }

  log() {
    if (this.trace) {
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
  
  info() {
    if (this.logLevel <= this.INFO) {
      let args = Array.prototype.slice.call(arguments);
      args.unshift('INFO');
      this.log.apply(this, args);
    }
  }

  debug() {
    if (this.logLevel <= this.DEBUG) {
      let args = Array.prototype.slice.call(arguments);
      args.unshift('DEBUG');
      this.log.apply(this, args);
    }
  }
}
