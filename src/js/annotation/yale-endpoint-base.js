import session from '../session';
import util from '../util/util';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import getMiradorWindow from '../mirador-window';
import getModalAlert from '../widgets/modal-alert';
import getErrorDialog from '../widgets/error-dialog';
import getAnnotationCache from './annotation-cache';
import CanvasToc from '../annotation/toc';

export default class YaleEndpointBase {
  constructor(options) {
    jQuery.extend(this, {
      annotationsList: [],
      dfd: null,
      imagesList: null,
      prefix: null,
      windowID: null,
      canvasToc: null
    }, options);
    
    this.init();
  }

  init() {
    this._cache = getAnnotationCache();
  }
  
  getCanvasToc() {
    return this.canvasToc;
  }
  
  getAnnotationLayers() {
    return this._annotationLayers;
  }
  
  search(options) {
    console.log('YaleEndpoint#search options: ' + JSON.stringify(options));
    const _this = this;
    const canvasId = options.uri;
    const progressPane = getModalAlert();
    const errorPane = getErrorDialog();
    
    progressPane.show();
    
    let p = new Promise(function(resolve, reject) {
      util.waitUntil(() => _this._cache.isValid(), function() {
        resolve();
      }, 250);
    });
    
    p.then(() => { return _this.getLayers(); });
    
    p.then(function() {
      if (_this._cache) {
        _this._cache.getAnnotationsPerCanvas(canvasId).then(function(annotations) {
          if (annotations !== null) { // cache hit
            console.log('HIT CACHE - annos:');
            console.dir(annotations);
            progressPane.hide();
            _this.annotationsList = annotations;
            _this._setEndpoint(annotations);
            _this.dfd.resolve(true);
          } else { // cache miss
            _this.searchRemote(canvasId).then(function(annotations) {
              console.log('MISSED CACHE - annos:');
              console.dir(annotations);
              progressPane.hide();
              _this.annotationsList = annotations;
              _this._cache.setAnnotationsPerCanvas(canvasId, annotations);
              // Set endpoint after saving to cache, because the db cannot
              // serialize the annotations with endpoint in them. 
              _this._setEndpoint(annotations);
              _this.dfd.resolve(true);
            }).catch(function(e) {
              console.log('ERROR searchRemote - ' + e.stack);
              progressPane.hide();
              _this.dfd.reject();
            });
          }
        }).catch(function(e) {
          console.log('ERROR cache.getAnnotationsPerCanvas - ' + e.stack);
          console.log(e.stack);
          progressPane.hide();
          _this.dfd.reject();
        });
      } 
    }).catch(function(e) {
      console.log('ERROR getLayers - ' + e.stack);
      progressPane.hide();
      errorPane.show('layers');
      _this.dfd.reject();
    });
  }
  
  searchRemote(canvasId) {
    const _this = this;
    const progressPane = getModalAlert();
    const errorPane = getErrorDialog();
    
    return new Promise(function(resolve, reject) {
      _this._search(canvasId).then(function(annotations) {
        progressPane.hide();
        resolve(annotations);
      }).catch(function(e) {
        console.log('ERROR _search - ' + e);
        progressPane.hide();
        errorPane.show('annotations');
        reject();
      });
    });
  }

  create (oaAnnotation, successCallback, errorCallback) {
    const _this = this;
    
    if (this.userAuthorize('create', oaAnnotation)) {
      this._create(oaAnnotation, function(anno) {
        _this.annotationsList.push(anno);
        _this._cache.invalidateAnnotation(anno);
        if (typeof successCallback === 'function') {
          successCallback(anno);
        }
      }, errorCallback);
    } else {
      console.log('YaleEndpoint#create user not authorized');
      getErrorDialog().show('authz_create');
      if (typeof errorCallback === 'function') {
        errorCallback();
      }
    }
  }

  update(oaAnnotation, successCallback, errorCallback) {
    const _this = this;
    const annotationId = oaAnnotation['@id'];
    
    if (this.userAuthorize('update', oaAnnotation)) {
      this._update(oaAnnotation, function(anno) {
        _this._cache.invalidateAnnotation(anno);
        jQuery.each(_this.annotationsList, function(index, value) {
          if (value['@id'] === annotationId) {
            _this.annotationsList[index] = anno;
            return false;
          }
        });
        if (typeof successCallback === 'function') {
          successCallback(anno);
        }
      }, errorCallback);
    } else {
      console.log('YaleEndpoint#update user not authorized');
      getErrorDialog().show('authz_update');
      if (typeof errorCallback === 'function') {
        errorCallback();
      }
    }
  }

  deleteAnnotation (annotationId, successCallback, errorCallback) {
    const _this = this;
    
    if (this.userAuthorize('delete', null)) {
      this._deleteAnnotation(annotationId,
        function() {
          _this._cache.invalidateAnnotationId(annotationId);
          _this.annotationsList = jQuery.grep(_this.annotationsList, function(value, index) {
            return value['@id'] !== annotationId;
          });
          if (typeof successCallback === 'function') {
            successCallback();
          }
        }, errorCallback);
    } else {
      console.log('YaleEndpoint#delete user not authorized');
      getErrorDialog().show('authz_update');
      if (typeof errorCallback === 'function') {
        errorCallback();
      }
    }
  }

  set (prop, value, options) {
    console.log('YaleEndpoint#set prop: ' + prop + ', value: ' + value + ', options: ' + JSON.stringify(options));
    if (options) {
      this[options.parent][prop] = value;
    } else {
      this[prop] = value;
    }
  }
  
  getLayers() {
    const _this = this;
    
    return new Promise(function(resolve, reject) {
      const layersCallback = function(layers) {
        _this._annotationLayers = layers;
        _this._cache.setLayers(layers);
        resolve(layers);
      };
      
      if (_this._cache) {
        _this._cache.getLayers().then(function(layers) {
          if (layers.length > 0) {
            console.log('HIT CACHE - layers');
            _this._annotationLayers = layers;
            resolve(layers);
          } else {
            console.log('MISSED CACHE - layers empty');
            _this._getLayers().then(layersCallback);
          }
        }).catch(function(e) { // error getting layers from cache
          console.log('MISSED CACHE - layers error');
          _this._getLayers().then(layersCallback);
        });
      } else {
        console.log('MISSED CACHE - layers no cache');
        _this._getLayers().then(layersCallback);
      }
    });
  }
  
  getLayerById(id) {
    jQuery.each(this.getLayers(), function(index, value) {
      if (id === value['@id']) {
        return value;
      }
    });
    return null;
  }
  
  updateOrder(canvasId, layerId, annoIds, successCallback, errorCallback) {
    if (this.userAuthorize('update', null)) {
      this._updateOrder(canvasId, layerId, annoIds, 
        function() {
          _this._cache.invalidateCanvasId(canvasId);
          successCallback();
        }, errorCallback);
    } else {
      console.log('YaleEndpoint#update user not authorized');
      getErrorDialog().show('authz_update');
      if (typeof errorCallback === 'function') {
        errorCallback();
      }
    }
  }
  
  userAuthorize (action, annotation) {
    if (action === 'create' || action === 'update' || action === 'delete') {
      return session.isEditor();
    } else {
      return true;
    }
  }
  
  // Convert Endpoint annotation to OA
  getAnnotationInOA(annotation) {
    var motivation = annotation.motivation;
    if (!(motivation instanceof Array)) {
      if (motivation !== 'oa:commenting') {
        //console.log('ERROR YaleEndpoint#getAnnotationInOA unexpected motivation value: ' + motivation + ', id: ' + annotation['@id']);
      }
      motivation = ['oa:commenting'];
    }
    
    var oaAnnotation = {
      '@context': 'http://iiif.io/api/presentation/2/context.json',
      '@type': 'oa:Annotation',
      '@id': annotation['@id'],
      motivation: motivation,
      resource : annotation.resource,
      on: annotation.on,
      within: annotation.within,
      //annotatedBy: annotatedBy,
      //annotatedAt: annotation.created,
      //serializedAt: annotation.updated,
      //permissions: annotation.permissions
    };

    //console.log('YaleEndpoint#getAnnotationInOA oaAnnotation:');
    //console.dir(oaAnnotation);
    return oaAnnotation;
  }

  // Converts OA Annotation to endpoint format
  getAnnotationInEndpoint(oaAnnotation) {
    var annotation = {
      '@id': oaAnnotation['@id'],
      '@type': oaAnnotation['@type'],
      '@context': oaAnnotation['@context'],
      motivation: oaAnnotation.motivation,
      resource: oaAnnotation.resource,
      on: oaAnnotation.on,
    };
    if (oaAnnotation.within) {
      annotation.within = oaAnnotation.within;
    }
    if (oaAnnotation.orderWeight) {
      annotation.orderWeight = oaAnnotation.orderWeight;
    }
    return annotation;
  }
  
  parseAnnotations() {
    //this.annotationsList = getMiradorProxyManager().getFirstWindowProxy().getAnnotationsList();
    var spec = getMiradorWindow().getConfig().extension.tagHierarchy;
    this.canvasToc = new CanvasToc(spec, this.annotationsList);
    console.log('YaleEndpoint#parseAnnotations canvasToc:');
    console.dir(this.canvasToc.annoHierarchy);
  }
  
  _setEndpoint(annotations) {
    const _this = this;
    jQuery.each(annotations, function(index, anno) {
      anno.endpoint = _this;
    });
  }
}
