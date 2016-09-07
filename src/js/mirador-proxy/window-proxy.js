export default class WindowProxy {
  constructor(window) {
    this.window = window;
  }
  
  getManifest() {
    return this.window.manifest;
  }

  getCurrentCanvasId(window) {
    return this.window.canvasID;
  }
  
  getEndPoint() {
    return this.window.endpoint;
  }
  
  getAnnotationsList() {
    return this.window.annotationsList;
  }
}