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
    var window = this.mirador.viewer.workspace.getWindowById(windowId);
    return window.endpoint;
  }
  
  publish(eventName, arg) {
    this.mirador.viewer.eventEmitter.publish(eventName, arg);
  }
  
  subscribe(eventName, callback) {
    this.mirador.viewer.eventEmitter.subscribe(eventName, callback);
  }
}

let _instance = null;

export default function() {
  if (!_instance) {
    _instance = new MiradorProxy();
  }
  return _instance;
};
