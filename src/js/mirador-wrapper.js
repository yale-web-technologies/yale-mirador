import getLogger from './util/logger';
import getMiradorProxyManager from './mirador-proxy/mirador-proxy-manager';
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
    proxyMgr.addMirador(miradorId, mirador);
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
  _createAnnotationWindows(options) {
    logger.debug('MiradorWrapper#_createAnnotationWindows options:', options);
    const {annotationId, layerIds, tocTags} = options;
    const config = {
      miradorId: this._miradorId,
      windows: []
    };

    logger.debug('tocTags:', tocTags);

    if (layerIds instanceof Array && layerIds.length > 0) {
      for (let layerId of layerIds) {
        config.windows.push({
          layerId: layerId || null,
          annotationId: annotationId || null,
          tocTags: tocTags || []
        });
      }
    } else if (annotationId) {
      config.windows.push({ annotationId: annotationId });
    }

    if (config.windows.length > 0) { // annotation window(s) will be created
      const miradorProxies = proxyMgr.getMiradorProxies();
      if (miradorProxies.length !== 1) {
        throw 'Cannot create default annotation windows: invalid number of mirador instances ' + miradorProxies.length;
      }
      const windowProxies = miradorProxies[0].getWindowProxies();
      if (windowProxies.length !== 1) {
        throw 'Cannot create default annotation windows: invalid number of mirador windows ' + windowProxies.length;
      }
      config.canvasWindowId = windowProxies[0].getId();
      miradorProxies[0].publish('YM_DISPLAY_ON');
      jQuery.publish('YM_ADD_WINDOWS', config);
    }
  }

  _bindEvents(options) {
    logger.debug('MiradorWrapper#_bindEvents options:', options);
    const _this = this;
    const miradorProxy = proxyMgr.getMiradorProxy(this._miradorId);

    miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', (event, params) => {
      logger.debug('MiradorWrapper#bindEvents received ANNOTATIONS_LIST_UPDATED');

      if (options.tagHierarchy) {
        const windowProxy = miradorProxy.getWindowProxyById(params.windowId);
        const endpoint = windowProxy.getEndPoint();
        endpoint.parseAnnotations();
      }

      jQuery.publish('YM_READY_TO_RELOAD_ANNO_WIN');
    });

    miradorProxy.subscribe('YM_ANNOWIN_ANNO_SHOW', (event, windowId, annoId) => {
      logger.debug('MiradorWrapper SUB YM_ANNOWIN_ANNO_SHOW windowId: ' + windowId  + ', annoId: ' + annoId);
      _this.options.grid.showAnnotation(_this._miradorId, windowId, annoId);
    });

    miradorProxy.subscribe('YM_CLICKED_OPEN_ANNO_WINDOW', (event, canvasWindowId) => {
      logger.debug('MiradorWrapper received YM_CLICKED_OPEN_ANNO_WINDOW from ', canvasWindowId);
      _this.options.grid.addAnnotationWindow({
        miradorId: _this._miradorId,
        canvasWindowId: canvasWindowId
      });
    });

    jQuery.subscribe('YM_READY_TO_RELOAD_ANNO_WIN', event => { // after annotations have been loaded
      if (_this._urlOptionsProcessed) { // run this function only once
        return;
      } else {
        _this._urlOptionsProcessed = true;
        _this._createAnnotationWindows({
          miradorId: options.miradorId,
          layerIds: options.layerIds,
          tocTags: options.tocTags,
          annotationId: options.annotationId,
          miradorProxy: miradorProxy
        });
      }
    });
  }
}
