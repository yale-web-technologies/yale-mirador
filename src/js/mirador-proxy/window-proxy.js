import getLogger from '../util/logger';

const logger = getLogger();

export default class WindowProxy {
  constructor(window) {
    logger.debug('WindowProxy#constructor window:', window);
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

  getCurrentCanvas() {
    const canvases = this.getCanvases();
    const canvasId = this.getCurrentCanvasId();
    const matches = canvases.filter(canvas => canvas['@id'] === canvasId);
    return matches[0];
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

  getSvgOverlay() {
    return this.window.focusModules.ImageView.annotationsLayer.drawTool.svgOverlay;
  }
}
