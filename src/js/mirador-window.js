import session from './session';
import getMiradorProxy from './mirador-proxy';
import annoUtil from './annotation/anno-util';
import getModalAlert from './widgets/modal-alert';

// JavaScript code for the browser window that embeds Mirador.
class MiradorWindow {
  constructor() {}
  
  init(options) {
    jQuery.extend(this, {
      mainMenu: null,
      grid: null
    }, options);
    
    const _this = this;
    const miradorProxy = getMiradorProxy();
    
    this.viewerElem = jQuery('#viewer');
     
    const dfd = this._fetchServerSettings();
    
    dfd.done(function(data) {
      const serverSettings = session.setServerSettings(data);
      const htmlOptions = _this._parseHtmlOptions();
      _this._miradorConfig = _this._buildMiradorConfig(serverSettings, htmlOptions);
      miradorProxy.setMirador(Mirador(_this._miradorConfig));
      _this._handleLoadOptions(htmlOptions);
      _this._bindEvents(serverSettings);
    });
    dfd.fail(function() {
      alert('ERROR failed to retrieve server settings');
    });
  }

  getConfig() {
    return this._miradorConfig;
  }
  
  /**
   * Process parameters passed from the server via HTML.
   */
  _handleLoadOptions(htmlOptions) {
    const _this = this;
    const miradorProxy = getMiradorProxy();
    
    jQuery.subscribe('YM_READY_TO_RELOAD_ANNO_WIN', function(event) { // after annotations have been loaded
      if (_this._urlOptionsProcessed) {
        return;
      } else {
        _this._urlOptionsProcessed = true;
      }
      let addAnnotationWindows = false;
      
      if (htmlOptions.tocTags.length > 0) {
        console.log('MiradorWindow#_handleLoadOptions has tocTags: ' + htmlOptions.tocTags);

        const endpoint = miradorProxy.getEndPoint();
        const toc = endpoint.getCanvasToc();
        const node = toc.getNode.apply(toc, htmlOptions.tocTags);
        const annotations = endpoint.annotationsList.filter(function(anno) {
          return annoUtil.hasTags(anno, htmlOptions.tocTags);
        });
        miradorProxy.publish('YM_DISPLAY_ON'); // display annotations
        if (node && node.annotation) {
          miradorProxy.publish('ANNOTATION_FOCUSED', ['', node.annotation]);
        }
        addAnnotationWindows = true;
      }
      if (htmlOptions.layerIds.length > 0) {
        addAnnotationWindows = true;
      }
      if (addAnnotationWindows) {
        for (let i = 0; i < htmlOptions.layerIds.length; ++i) {
          jQuery.publish('YM_ADD_WINDOW', { 
            tocTags: htmlOptions.tocTags,
            layerId: htmlOptions.layerIds[i],
          });
        }
      }
    });
  }
  
  /**
   * Sets up configuration parameters to pass to Mirador.
   */
  _buildMiradorConfig(serverSettings, htmlOptions) {
    const config = jQuery.extend(true, {}, Mirador.DEFAULT_SETTINGS); // deep copy from Mirador.DEFAULT_SETTINGS
    let endpointConfig = null;
    
    if (serverSettings.endpointUrl === 'firebase') {
      endpointConfig = {
        name: 'Yale (Firebase) Annotations',
        module: 'YaleDemoEndpoint',
        options: {}
      };
    } else {
      endpointConfig = {
        name: 'Yale Annotations',
        module: 'YaleEndpoint',
        options: { prefix: serverSettings.endpointUrl }
      };
    }

    const windowObject = {
      loadedManifest: htmlOptions.manifestUri
    };
    if (htmlOptions.canvasId) { // if instructed to load a specific canvas
      windowObject.canvasID = htmlOptions.canvasId;
    }
    
    jQuery.extend(config, {
      id: 'viewer',
      buildPath: serverSettings.buildPath || '/',
      i18nPath: '/locales/',
      imagesPath: '/images/',
      logosPath: '/images/logos/',
      mainMenuSettings: { show: false },
      data: [{ manifestUri: htmlOptions.manifestUri }],
      windowObjects: [windowObject],
      autoHideControls: false, // autoHide is bad for touch-only devices
      annotationEndpoint: endpointConfig,
      annotationBodyEditor: {
        module: 'AnnotationEditor',
        options: {
          miradorDriven: true,
          mode: 'create'
        }
      },
      extension: {}
    });
    
    config.windowSettings.displayLayout = false;
    
    if (!session.isEditor()) {
      config.windowSettings.canvasControls.annotations.annotationCreation = false;
    }

    if (serverSettings.tagHierarchy) {
      config.extension.tagHierarchy = serverSettings.tagHierarchy;
    }
    console.log('MiradorWindow config: ' + JSON.stringify(config, null, 2));
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

  _bindEvents(serverSettings) {
    const _this = this;
    const miradorProxy = getMiradorProxy();
    
    jQuery(window).resize(function() {
      _this.grid.resize();
    });

    miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', function(event, params) {
      console.log('MiradorWindow#bindEvents received ANNOTATIONS_LIST_UPDATED');
      if (serverSettings.tagHierarchy) {
        const endpoint = miradorProxy.getEndPoint(params.windowId);
        endpoint.parseAnnotations();
      }
      jQuery.publish('YM_READY_TO_RELOAD_ANNO_WIN');
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
