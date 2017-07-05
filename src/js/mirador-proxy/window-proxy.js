import getLogger from '../util/logger';

const logger = getLogger();

export default class WindowProxy {
  constructor(window) {
    //logger.debug('WindowProxy#constructor window:', window);
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

  setCurrentCanvasId(canvasId, options) {
    logger.debug('WindowProxy#setCurrentCanvasId canvasId:', canvasId, 'options', options);
    this.window.setCurrentCanvasID(canvasId, options);
  }

  getImageView() {
    return this.window.focusModules.ImageView;
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
    const imageView = this.getImageView();
    return imageView ? imageView.annotationsLayer.drawTool.svgOverlay : null;
  }
}
