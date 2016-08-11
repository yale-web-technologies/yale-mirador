import session from './session';
import config from './mirador-default-settings';
import getMiradorProxy from './mirador-proxy';

// JavaScript code for the browser window that embeds Mirador.

class MiradorWindow {
  constructor() {}
  
  init(options) {
    jQuery.extend(this, {
      mainMenu: null,
      grid: null
    }, options);
    
    var _this = this;
    
    this.miradorViewer = jQuery('#viewer');
    this.miradorProxy = getMiradorProxy();
    
    var dfd = this.fetchServerSettings();
    
    dfd.done(function(data) {
      _this.serverSettings = session.setServerSettings(data);
      if (data.tagHierarchy) {
        _this.tagHierarchy = data.tagHierarchy;
      } else {
        _this.tagHierarchy = null;
      }
    });
    dfd.fail(function() {
      console.log('ERROR failed to retrieve server settings');
      _this.tagHierarchy = null;
    });
    dfd.always(function() {
      _this.initMirador();
      _this.bindEvents();
    });
  }
  
  initMirador() {
    var serverSettings = this.serverSettings;
    var viewer = this.miradorViewer;
    var manifestUri = decodeURIComponent(viewer.attr('data-manifest-url'));
    var endpointUrl = serverSettings.endpointUrl;
    
    config.buildPath = serverSettings.buildPath || '/';
    
    config.data = [{ manifestUri: manifestUri }];
    config.windowObjects[0].loadedManifest = manifestUri;
    if (! session.isEditor()) {
      config.windowObjects[0].annotationCreation = false;
    }
    config.annotationEndpoint.options.prefix = endpointUrl;
    config.autoHideControls = false;
    
    if (this.tagHierarchy) {
      config.extension.tagHierarchy = this.tagHierarchy;
    }
    
    if (this.serverSettings.endpointUrl === 'firebase') {
      config.annotationEndpoint = {
        name: 'Yale (Firebase) Annotations',
        module: 'YaleDemoEndpoint',
        options: {}
      };
    }
    
    console.log(JSON.stringify(config, null, 2));
    this.config = config;
    
    var mirador = Mirador(config);
    this.miradorProxy.setMirador(mirador);
  }
  
  getConfig() {
    return this.config;
  }
  
  fetchServerSettings() {
    var dfd = jQuery.Deferred();
    var viewerElem = jQuery('#viewer');
    var settingsUrl = viewerElem.attr('data-settings-url');
    var roomId = viewerElem.attr('data-room-id');
    
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
  
  bindEvents() {
    var _this = this;
    
    jQuery(window).resize(function() {
      _this.grid.resize();
    });

    this.miradorProxy.subscribe('ANNOTATIONS_LIST_UPDATED', function(event, params) {
      console.log('MiradorWindow#bindEvents received ANNOTATIONS_LIST_UPDATED');
      if (_this.tagHierarchy) {
        var endpoint = _this.miradorProxy.getEndPoint(params.windowId);
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
