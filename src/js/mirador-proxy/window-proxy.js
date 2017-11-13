import getLogger from 'util/logger';

const logger = getLogger();

export default class WindowProxy {
  constructor(window) {
    //logger.debug('WindowProxy#constructor window:', window);
    this.window = window;
  }

  /**
   * ID of the window
   */
  getWindowId() {
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
    //logger.debug('WindowProxy#setCurrentCanvasId canvasId:', canvasId, 'options', options);
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
    const drawTool = this.getDrawTool();
    return drawTool ? drawTool.svgOverlay : null;
  }

  getDrawTool() {
    const imageView = this.getImageView();
    return imageView ? imageView.annotationsLayer.drawTool : null;
  }

  getSidePanel() {
    return this.window.sidePanel;
  }

  /**
   * @param {*} klass CSS class for the root element of sidebar content (child of .tabContentArea)
   */
  getSidePanelTabContentElement(klass) {
    return this.getSidePanel().element.find('.tabContentArea > .' + klass);
  }

}
