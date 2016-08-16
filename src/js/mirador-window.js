import session from './session';
import defaultConfig from './mirador-default-settings';
import getMiradorProxy from './mirador-proxy';
import annoUtil from './annotation/anno-util';

// JavaScript code for the browser window that embeds Mirador.

class MiradorWindow {
  constructor() {}
  
  init(options) {
    jQuery.extend(this, {
      mainMenu: null,
      grid: null
    }, options);
    
    const _this = this;
    
    this.viewerElem = jQuery('#viewer');
    this.miradorProxy = getMiradorProxy();
    
    const dfd = this._fetchServerSettings();
    
    dfd.done(function(data) {
      _this.serverSettings = session.setServerSettings(data);
    });
    dfd.fail(function() {
      console.log('ERROR failed to retrieve server settings');
      });
    dfd.always(function() {
      _this._initMirador();
      _this._bindEvents();
    });
  }

  getConfig() {
    return this.config;
  }
  
  _initMirador() {
    const _this = this;
    const serverSettings = this.serverSettings;
    const htmlOptions = this._parseHtmlOptions();
    this.config = this._buildMiradorConfig(serverSettings, htmlOptions);
    const mirador = Mirador(this.config);
    this.miradorProxy.setMirador(mirador);
    
    if (htmlOptions.tocTags.length > 0) {
      console.log('MiradorWindow#_initMirador has tocTags: ' + htmlOptions.tocTags);
      this.miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', function(event) {
        const endpoint = _this.miradorProxy.getEndPoint();
        const annotations = endpoint.annotationsList.filter(function(anno) {
          return annoUtil.hasTags(anno, htmlOptions.tocTags);
        });
        _this.miradorProxy.publish('YM_DISPLAY_ON'); // display annotations
        if (annotations.length > 0) {
          _this.miradorProxy.publish('ANNOTATION_FOCUSED', ['', annotations[0]]);
        }
      });
    }
  }
  
  /**
   * Sets up configuration parameters to pass to Mirador.
   */
  _buildMiradorConfig(serverSettings, htmlOptions) {
    const config = jQuery.extend(true, {}, defaultConfig); // deep copy from defaultConfig
    
    config.buildPath = serverSettings.buildPath || '/';
    config.data = [{ manifestUri: htmlOptions.manifestUri }];

    const winObj = config.windowObjects[0];

    winObj.loadedManifest = htmlOptions.manifestUri;
    
    if (htmlOptions.canvasId) { // if instructed to load a specific canvas
      winObj.canvasID = htmlOptions.canvasId;
    }
    if (!session.isEditor()) {
      winObj.annotationCreation = false;
    }
    config.annotationEndpoint.options.prefix = serverSettings.endpointUrl;
    config.autoHideControls = false; // autoHide is bad for touch-only devices

    if (serverSettings.tagHierarchy) {
      config.extension.tagHierarchy = serverSettings.tagHierarchy;
    }
    if (serverSettings.endpointUrl === 'firebase') {
      config.annotationEndpoint = {
        name: 'Yale (Firebase) Annotations',
        module: 'YaleDemoEndpoint',
        options: {}
      };
    }
    return config;
  }
  
  /**
   * Retrieves parameters passed via HTML attributes.
   */
  _parseHtmlOptions() {
    const viewer = this.viewerElem;
    const options = {};
    const tocTagsStr = viewer.attr('data-toc-tags') || '';
    const layerIdsStr = viewer.attr('data-layer-ids') || '';
    
    options.manifestUri = viewer.attr('data-manifest-url');
    options.canvasId = viewer.attr('data-canvas-id') || '';
    options.tocTags = tocTagsStr ? tocTagsStr.split(',') : [];
    options.layerIds = layerIdsStr ? layerIdsStr.split(',') : [];
    
    return options;
  }
  
  /**
   * Retrieves settings from the server via a REST API.
   */
  _fetchServerSettings() {
    const dfd = jQuery.Deferred();
    const viewerElem = jQuery('#viewer');
    const settingsUrl = viewerElem.attr('data-settings-url');
    const roomId = viewerElem.attr('data-room-id');
    
    console.log('settingsUrl: ' + settingsUrl);
    
    jQuery.ajax({
      url: settingsUrl + '?room_id=' + roomId,
      success: function(data) {
        dfd.resolve(data);
      },
      error: function() {
        dfd.reject();
      }
    });
    return dfd;
  }

  _bindEvents() {
    const _this = this;
    
    jQuery(window).resize(function() {
      _this.grid.resize();
    });

    this.miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', function(event, params) {
      console.log('MiradorWindow#bindEvents received ANNOTATIONS_LIST_UPDATED');
      if (_this.tagHierarchy) {
        const endpoint = _this.miradorProxy.getEndPoint(params.windowId);
        endpoint.parseAnnotations();
      }
      jQuery.publish('MR_READY_TO_RELOAD_ANNO_WIN');
    });
  }
}

let _instance = null;

export default function() {
  if (!_instance) {
    _instance = new MiradorWindow();
  }
  return _instance;
};
