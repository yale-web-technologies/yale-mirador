import {AnnotationExplorer} from '../import';
import AnnotationSource from './annotation-source';
import CanvasToc from '../annotation/toc';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import getMiradorWindow from '../mirador-window';
import getModalAlert from '../widgets/modal-alert';
import getErrorDialog from '../widgets/error-dialog';
import session from '../session';
import util from '../util/util';

let _explorer = null;

export default class YaleEndpoint {
  constructor(options) {
    jQuery.extend(this, {
      annotationsList: [],
      prefix: null,
      dfd: null
    }, options);
    
    const _this = this;
  }

  search(options) {
    console.log('YaleEndpoint#search options: ', options);
    const _this = this;
    const canvasId = options.uri;
    const progressPane = getModalAlert();
    const errorPane = getErrorDialog();
    const explorer = this.getAnnotationExplorer();
    
    progressPane.show();
    explorer.getAnnotations({ canvasId: canvasId })
    .catch((reason) => { 
      const msg = 'ERROR YaleEndpoint#search getAnnotations - ' + reason;
      console.log(msg);
      throw(msg);
    })
    .then((annotations) => {
      console.log('YaleEndpoint#search annotations: ', annotations);
      progressPane.hide();
      for (let anno of annotations) {
        anno.endpoint = _this;
      }
      _this.annotationsList = annotations;
      _this.dfd.resolve(true);
    })
    .catch(function(reason) {
      console.log('ERROR YaleEndpoint#search failed - ', reason);
      progressPane.hide();
      errorPane.show('annotations');
    });
  }

  create(oaAnnotation, successCallback, errorCallback) {
    const _this = this;

    if (this.userAuthorize('create', oaAnnotation)) {
      this._create(oaAnnotation)
      .catch((reason) => {
        const msg = 'YaleEndpoint#create _create failed - ' + reason;
        console.log(msg);
        throw msg;
      })
      .then((anno) => {
        console.log('YaleEndpoint#create successful with anno: ', anno);
        anno.endpoint = _this;
        if (typeof successCallback === 'function') {
          successCallback(anno);
        }
      })
      .catch((reason) => {
        console.log('ERROR YaleEndpoint#create successCallback failed');
        errorCallback();
      });
    } else {
      getErrorDialog().show('authz_create');
      if (typeof errorCallback === 'function') {
        errorCallback();
      }
    }
  }

  _create(oaAnnotation) {
    console.log('YaleEndpoint#_create oaAnnotation:', oaAnnotation);
    const _this = this;
    const explorer = this.getAnnotationExplorer();

    return explorer.createAnnotation(oaAnnotation)
    .catch((reason) => {
      const msg = 'YaleEndpoint#_create createAnnotation failed - ' + reason;
      console.log(msg);
      throw(msg);
    })
    .then((anno) => {
      _this.annotationsList.push(anno);
      return anno;
    });
  }

  update(oaAnnotation, successCallback, errorCallback) {
    const annotationId = oaAnnotation['@id'];
    
    if (this.userAuthorize('update', oaAnnotation)) {
      this._update(oaAnnotation)
      .catch((reason) => {
        const msg = 'ERROR YaleEndpoint#update _update failed - ' + reason;
        console.log(msg);
        errorCallback();
      })
      .then((anno) => {
        if (typeof successCallback === 'function') {
          successCallback(anno);
        }
      });
    } else {
      getErrorDialog().show('authz_update');
      if (typeof errorCallback === 'function') {
        errorCallback();
      }
    }
  }

  _update(oaAnnotation) {
    console.log('YaleEndpoint#_update oaAnnotation:', oaAnnotation);
    const _this = this;
    const explorer = this.getAnnotationExplorer();
    const annotationId = oaAnnotation['@id'];
    
    const promise = Promise.resolve().then(() => {
      return explorer.updateAnnotation(oaAnnotation);
    })
    .catch((reason) => {
      const msg = 'ERROR YaleEndpoint#_update updateAnnotation - ' + reason;
      console.log(msg);
      throw(msg);
    })
    .then((anno) => {
      jQuery.each(_this.annotationsList, function(index, value) {
        if (value['@id'] === annotationId) {
          _this.annotationsList[index] = anno;
          return false;
        }
      });
      return anno;
    });
    return promise;
  }

  deleteAnnotation(annotationId, successCallback, errorCallback) {
    console.log('YaleEndpoint#deleteAnnotation annotationId: ' + annotationId);
    const _this = this;
     
    if (this.userAuthorize('delete', null)) {
      this._deleteAnnotation(annotationId)
      .then(() => {
        if (typeof successCallback === 'function') {
          successCallback();
        }
      })
      .catch((reason) => {
        errorCallback();
      });
    } else {
       console.log('YaleEndpoint#delete user not authorized');
       getErrorDialog().show('authz_update');
       if (typeof errorCallback === 'function') {
         errorCallback();
       }
    }
  }
  
  _deleteAnnotation(annotationId) {
    console.log('YaleEndpoint#_deleteAnnotation annotationId:', annotationId);
    const _this = this;
    const explorer = this.getAnnotationExplorer();
    
    const promise = explorer.deleteAnnotation(annotationId)
    .catch((reason) => {
      const msg = 'ERROR YaleEndpoint#_deleteAnnotation explorer.deleteAnnotation - ' + reason;
      console.log(msg);
      throw(msg);
    })
    .then((anno) => {
      _this.annotationsList = jQuery.grep(_this.annotationsList,
        (value, index) => value['@id'] !== annotationId);
      return anno;
    });
    return promise;
  }

  getLayers() {
    console.log('YaleEndpoint#getLayers');
    const explorer = this.getAnnotationExplorer();
    return explorer.getLayers();
  }
  
  updateOrder(canvasId, layerId, annoIds, successCallback, errorCallback) {
    console.log('YaleEndpoint#updateOrder canvasId:', canvasId, 'layerId:', layerId, 'annoIds:', annoIds);
    const _this = this;
     
    if (this.userAuthorize('update', null)) {
      this._updateOrder(canvasId, layerId, annoIds)
      .catch((reason) => {
        console.log('ERROR _upadteOrder failed: ', reason);
      })
      .then(() => {
        if (typeof successCallback === 'function') {
          successCallback();
        }
      })
      .catch((reason) => {
        errorCallback();
      });
    } else {
       console.log('YaleEndpoint#updateOrder user not authorized');
       getErrorDialog().show('authz_update');
       if (typeof errorCallback === 'function') {
         errorCallback();
       }
    }
  }

  _updateOrder(canvasId, layerId, annoIds) {
    console.log('_updateOrder');
    const explorer = this.getAnnotationExplorer();
    return explorer.updateAnnotationListOrder(canvasId, layerId, annoIds);
  }

  userAuthorize (action, annotation) {
    if (action === 'create' || action === 'update' || action === 'delete') {
      return session.isEditor();
    } else {
      return true;
    }
  }
  
  set(prop, value, options) {
    console.log('YaleEndpoint#set prop:', prop, ', value:', value, ', options:', options);
    if (options) {
      this[options.parent][prop] = value;
    } else {
      this[prop] = value;
    }
  }
  
  getAnnotationExplorer() {
    if (!_explorer) {
      _explorer = new AnnotationExplorer({
        dataSource: this.createAnnotationSource()
      });
    }
    return _explorer;
  }
  
  createAnnotationSource() {
    const source = getMiradorWindow().getConfig().annotationEndpoint.dataSource;
    console.log('source: ', source);
    return new source({prefix: this.prefix});
  }

  parseAnnotations() {
    const explorer = this.getAnnotationExplorer();
    const spec = getMiradorWindow().getConfig().extension.tagHierarchy;
    explorer.reloadAnnotationToc(spec, this.annotationsList);
    /*const spec = getMiradorWindow().getConfig().extension.tagHierarchy;
    this.canvasToc = new CanvasToc(spec, this.annotationsList);
    console.log('YaleEndpoint#parseAnnotations canvasToc:');
    console.dir(this.canvasToc.annoHierarchy);*/
  }
}
