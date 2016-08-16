class MiradorProxy {
  constructor() {
    this.mirador = null; // Mirador instance
  }

  getMirador() {
    return this.mirador;
  }
  
  setMirador(mirador) {
    this.mirador = mirador;
  }
  
  getState() {
    return this.mirador.viewer.state;
  }
  
  getFirstWindow() {
    return this.mirador.viewer.workspace.windows[0];
  }
  
  getCurrentCanvasId(window) {
    return window.canvasID;
  }
  
  getEndPoint(windowId) {
    const window = windowId ? this.mirador.viewer.workspace.getWindowById(windowId) : this.getFirstWindow();
    return window.endpoint;
  }
  
  publish() {
    const eventEmitter = this.mirador.viewer.eventEmitter;
    let args = Array.from(arguments);
    eventEmitter.publish.apply(eventEmitter, args);
  }
  
  subscribe(eventName, callback) {
    this.mirador.viewer.eventEmitter.subscribe(eventName, callback);
  }
  
  unsubscribe(eventName) {
    this.mirador.viewer.eventEmitter.unsubscribe(eventName);
  }
}

let _instance = null;

export default function() {
  if (!_instance) {
    _instance = new MiradorProxy();
  }
  return _instance;
};
