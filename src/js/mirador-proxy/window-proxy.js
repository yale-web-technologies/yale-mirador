import getLogger from '../util/logger';

export default class WindowProxy {
  constructor(window) {
    this.logger = getLogger();
    this.logger.debug('WindowProxy() window:', window);
    this.window = window;
  }

  /**
   * ID of the window
   */
  getId() {
    return this.window.id;
  }

  getManifest() {
    return this.window.manifest;
  }

  getCurrentCanvasId() {
    return this.window.canvasID;
  }

  /**
   * Annotation endpoint
   */
  getEndPoint() {
    return this.window.endpoint;
  }

  getCanvases() {
    return this.window.manifest.getCanvases();
  }

  getAnnotationsList() {
    return this.window.annotationsList;
  }
}
