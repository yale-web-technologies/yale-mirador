import getApp from './app';
import getLogger from './util/logger';
import getMiradorProxyManager from './mirador-proxy/mirador-proxy-manager';
import LayoutConfigParser from './layout/layout-config-parser';
import MiradorConfigBuilder from './config/mirador-config-builder';
import WindowProxy from './mirador-proxy/window-proxy';

const logger = getLogger();
const proxyMgr = getMiradorProxyManager();

/**
 * Wrapper of a single Mirador instance
 */
export default class MiradorWrapper {
  constructor(options) {
    logger.debug('MiradorWrapper#constructor options:', options);
    this.options = Object.assign({
      grid: null,
      miradorOptions: null
    }, options);
    this._miradorId = options.miradorOptions.miradorId;
    this._miradorConfig = this._buildMiradorConfig(options.miradorOptions);
    this._mirador = Mirador(this._miradorConfig);
    this._addToMiradorProxy(this._miradorId, this._mirador);
    this._bindEvents(options.miradorOptions);
  }

  getMirador() {
    return this._mirador;
  }

  getConfig() {
    return this._miradorConfig;
  }

  _addToMiradorProxy(miradorId, mirador) {
    const miradorProxy = proxyMgr.addMirador(miradorId, mirador);
    miradorProxy.subscribe('YM_CANVAS_ID_SET', function(event, windowId, canvasId) {
      const windowProxy = miradorProxy.getWindowProxyById(windowId);
      if (windowProxy) {
        const canvas = windowProxy.getCurrentCanvas();
        logger.info('Window', windowId, 'Canvas:', canvas);
      } else {
        logger.error('MiradorWrapper#_addToMiradorProxy windowProxy unavailable for id', windowId);
      }
    });
  }

  /**
   * Sets up configuration parameters to pass to Mirador.
   */
  _buildMiradorConfig(options) {
    const builder = new MiradorConfigBuilder(options);
    return builder.buildConfig();
  }

  /**
   * Optionally create annotations windows after checking parameters.
   * It will examine the parameters and determine how many annotations
   * to create and how to configure them.
   */
  _createAnnotationWindows(imageWindowId, options) {
    const toc = getApp().getAnnotationExplorer().getAnnotationToc();
    const parser = new LayoutConfigParser({
      miradorId: options.miradorId,
      imageWindowId: imageWindowId,
      layerIds: options.layerIds,
      toc: toc,
      tocTags: options.tocTags,
      annotationId: options.annotationId
    });
    const windowsConfig = parser.getWindowsConfig();
    if (windowsConfig) {
      const miradorProxy = proxyMgr.getMiradorProxy(this._miradorId);
      miradorProxy.publish('YM_DISPLAY_ON');
      jQuery.publish('YM_ADD_WINDOWS', windowsConfig);
    }
  }

  _bindEvents(options) {
    logger.debug('MiradorWrapper#_bindEvents options:', options);
    const miradorProxy = proxyMgr.getMiradorProxy(this._miradorId);

    miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', (event, params) => {
      logger.debug('MiradorWrapper#bindEvents received ANNOTATIONS_LIST_UPDATED');

      if (options.tagHierarchy) {
        const windowProxy = miradorProxy.getWindowProxyById(params.windowId);
        const endpoint = windowProxy.getEndPoint();
        endpoint.parseAnnotations();
      }

      jQuery.publish('YM_READY_TO_RELOAD_ANNO_WIN', params.windowId);
    });

    miradorProxy.subscribe('YM_ANNOWIN_ANNO_SHOW', (event, windowId, annoId) => {
      logger.debug('MiradorWrapper SUB YM_ANNOWIN_ANNO_SHOW windowId: ' + windowId  + ', annoId: ' + annoId);
      this.options.grid.showAnnotation(this._miradorId, windowId, annoId);
    });

    miradorProxy.subscribe('YM_CLICKED_OPEN_ANNO_WINDOW', (event, canvasWindowId) => {
      logger.debug('MiradorWrapper received YM_CLICKED_OPEN_ANNO_WINDOW from ', canvasWindowId);
      miradorProxy.publish('YM_DISPLAY_ON');
      this.options.grid.addAnnotationWindow({
        miradorId: this._miradorId,
        imageWindowId: canvasWindowId
      });
    });

    jQuery.subscribe('YM_READY_TO_RELOAD_ANNO_WIN', (event, imageWindowId) => { // after annotations have been loaded
      if (this._urlOptionsProcessed) { // run this function only once
        return;
      } else {
        this._urlOptionsProcessed = true;
        this._createAnnotationWindows(imageWindowId, options);
      }
    });
  }
}
