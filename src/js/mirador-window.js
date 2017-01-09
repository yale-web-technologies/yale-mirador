import {annoUtil} from './import';
import getMiradorProxyManager from './mirador-proxy/mirador-proxy-manager';
import getModalAlert from './widgets/modal-alert';
import MiradorConfigBuilder from './config/mirador-config-builder';
import session from './session';
import WindowProxy from './mirador-proxy/window-proxy';

export default function getMiradorWindow() {
  if (!_instance) {
    _instance = new MiradorWindow();
  }
  return _instance;
};

let _instance = null;

// JavaScript code for the browser window that embeds Mirador.
class MiradorWindow {
  init(options) {
    this.options = jQuery.extend({
      mainMenu: null,
      grid: null,
      settings: null // settings retrieved from remote API
    }, options);

    const _this = this;
    const miradorId = Mirador.genUUID();
    const configOptions = jQuery.extend(this.options.settings, {
      miradorId: miradorId,
      defaultSettings: Mirador.DEFAULT_SETTINGS,
      isEditor: session.isEditor()
    });
    console.log('MiradorWindow#init configOptions:', configOptions);
    _this._miradorConfig = _this._buildMiradorConfig(configOptions);
    _this._createMirador(_this._miradorConfig);
    _this._bindEvents(configOptions);
  }

  getConfig() {
    return this._miradorConfig;
  }

  _createMirador(settings) {
    this._miradorId = settings.id;
    this.options.grid.addMiradorWindow(this._miradorId);

    const mirador = Mirador(settings);
    getMiradorProxyManager().addMirador(this._miradorId, mirador);
  }

  /**
   * Sets up configuration parameters to pass to Mirador.
   */
  _buildMiradorConfig(options) {
    const builder = new MiradorConfigBuilder(options);
    return builder.buildConfig();
  }

  _createAnnotationWindows(options) {
    console.log('MiradorWindow#_createAnnotationWindows options:', options);
    const {annotationId, layerIds, tocTags} = options;
    const config = {
      miradorId: options.miradorId,
      windows: []
    };

    console.log('tocTags:', tocTags);

    if (layerIds instanceof Array && layerIds.length > 0) {
      for (let layerId of layerIds) {
        config.windows.push({
          layerId: layerId,
          annotationId: annotationId || null,
          tocTags: tocTags || []
        });
      }
    } else if (annotationId) {
      config.windows.push({ annotationId: annotationId });
    }

    if (config.windows.length > 0) {
      options.miradorProxy.publish('YM_DISPLAY_ON');
      jQuery.publish('YM_ADD_WINDOWS', config);
    }
  }

  _bindEvents(options) {
    const _this = this;
    const miradorProxy = getMiradorProxyManager().getMiradorProxy(options.miradorId);
    
    jQuery(window).resize(function() {
      _this.options.grid.resize();
    });

    miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', function(event, params) {
      console.log('MiradorWindow#bindEvents received ANNOTATIONS_LIST_UPDATED');

      if (options.tagHierarchy) {
        const windowProxy = miradorProxy.getWindowProxyById(params.windowId);
        const endpoint = windowProxy.getEndPoint();
        endpoint.parseAnnotations();
      }

      jQuery.publish('YM_READY_TO_RELOAD_ANNO_WIN');
    });

    miradorProxy.subscribe('YM_ANNOWIN_ANNO_SHOW', function(event, windowId, annoId) {
      console.log('MiradorWindow SUB YM_ANNOWIN_ANNO_SHOW windowId: ' + windowId  + ', annoId: ' + annoId);
      _this.options.grid.showAnnotation(_this._miradorId, windowId, annoId);
    });

    jQuery.subscribe('YM_READY_TO_RELOAD_ANNO_WIN', function(event) { // after annotations have been loaded
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
