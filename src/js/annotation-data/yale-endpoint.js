import {AnnotationExplorer} from '../import';
import AnnotationSource from './annotation-source';
import getErrorDialog from '../widgets/error-dialog';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import getPageController from '../page-controller';
import getModalAlert from '../widgets/modal-alert';
import session from '../session';
import util from '../util/util';

const logger = getLogger();
let _explorer = null;

export default class YaleEndpoint {
  constructor(options) {
    jQuery.extend(this, {
      annotationsList: [],
      prefix: null,
      dfd: null
    }, options);
  }

  search(options) {
    logger.debug('YaleEndpoint#search', options);
    const _this = this;
    const canvasId = options.uri;
    const progressPane = getModalAlert();
    const errorPane = getErrorDialog();
    const explorer = this.getAnnotationExplorer();

    progressPane.show();
    explorer.getAnnotations({ canvasId: canvasId })
    .catch(reason => {
      const msg = 'ERROR YaleEndpoint#search getAnnotations - ' + reason;
      throw(msg);
    })
    .then(annotations => {
      logger.debug('YaleEndpoint#search annotations: ', annotations);
      progressPane.hide();
      for (let anno of annotations) {
        anno.endpoint = _this;
      }
      _this.annotationsList = annotations;
      try {
        _this.dfd.resolve(true);
      } catch(e) {
        logger.error('YaleEndpoint#search dfd.resolve failed - ', e);
      }
    })
    .catch(function(reason) {
      logger.error('YaleEndpoint#search failed - ', reason);
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
        throw msg;
      })
      .then((anno) => {
        logger.debug('YaleEndpoint#create successful with anno: ', anno);
        anno.endpoint = _this;
        if (typeof successCallback === 'function') {
          successCallback(anno);
        }
      })
      .catch((reason) => {
        logger.error('ERROR YaleEndpoint#create successCallback failed');
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
    logger.debug('YaleEndpoint#_create oaAnnotation:', oaAnnotation);
    const _this = this;
    const explorer = this.getAnnotationExplorer();

    return explorer.createAnnotation(oaAnnotation)
    .catch((reason) => {
      const msg = 'YaleEndpoint#_create createAnnotation failed - ' + reason;
      throw(msg);
    })
    .then((anno) => {
      _this.annotationsList.push(anno);
      return anno;
    });
  }

  update(oaAnnotation, successCallback, errorCallback) {
    const _this = this;
    const annotationId = oaAnnotation['@id'];

    if (this.userAuthorize('update', oaAnnotation)) {
      this._update(oaAnnotation)
      .catch((reason) => {
        const msg = 'ERROR YaleEndpoint#update _update failed - ' + reason;
        logger.error(msg);
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
    logger.debug('YaleEndpoint#_update oaAnnotation:', oaAnnotation);
    const _this = this;
    const explorer = this.getAnnotationExplorer();
    const annotationId = oaAnnotation['@id'];

    const promise = Promise.resolve().then(() => {
      return explorer.updateAnnotation(oaAnnotation);
    })
    .catch((reason) => {
      const msg = 'ERROR YaleEndpoint#_update updateAnnotation - ' + reason;
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
    logger.debug('YaleEndpoint#deleteAnnotation annotationId: ' + annotationId);
    const _this = this;

    if (this.userAuthorize('delete', null)) {
      this._deleteAnnotation(annotationId)
      .then(() => {
        if (typeof successCallback === 'function') {
          successCallback();
        }
      })
      .catch(reason => {
        logger.error('YaleEndpoint#deleteAnnotation _deleteAnnotation failed:', reason);
        errorCallback();
      });
    } else {
       logger.info('YaleEndpoint#delete user not authorized');
       getErrorDialog().show('authz_update');
       if (typeof errorCallback === 'function') {
         errorCallback();
       }
    }
  }

  _deleteAnnotation(annotationId) {
    logger.debug('YaleEndpoint#_deleteAnnotation annotationId:', annotationId);
    const _this = this;
    const explorer = this.getAnnotationExplorer();

    const promise = explorer.deleteAnnotation(annotationId)
    .catch((reason) => {
      const msg = 'ERROR YaleEndpoint#_deleteAnnotation explorer.deleteAnnotation - ' + reason;
      throw(msg);
    })
    .then((anno) => {
      _this.annotationsList = jQuery.grep(_this.annotationsList,
        (value, index) => value['@id'] !== annotationId);
      return anno;
    });
    return promise;
  }

  async getLayers() {
    logger.debug('YaleEndpoint#getLayers');
    const explorer = this.getAnnotationExplorer();
    return explorer.getLayers();
  }

  updateOrder(canvasId, layerId, annoIds, successCallback, errorCallback) {
    logger.debug('YaleEndpoint#updateOrder canvasId:', canvasId, 'layerId:', layerId, 'annoIds:', annoIds);
    const _this = this;

    if (this.userAuthorize('update', null)) {
      this._updateOrder(canvasId, layerId, annoIds)
      .catch((reason) => {
        const msg = 'YaleEndpoint#updateOrder _upadteOrder failed: ' + reason;
        throw msg;
      })
      .then(() => {
        if (typeof successCallback === 'function') {
          successCallback();
        }
      })
      .catch((reason) => {
        logger.error('YaleEndpoint#updateOrder', reason);
        errorCallback();
      });
    } else {
       logger.info('YaleEndpoint#updateOrder user not authorized');
       getErrorDialog().show('authz_update');
       if (typeof errorCallback === 'function') {
         errorCallback();
       }
    }
  }

  _updateOrder(canvasId, layerId, annoIds) {
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
    logger.debug('YaleEndpoint#set prop:', prop, ', value:', value, ', options:', options);
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
    const source = getPageController().getConfig().annotationEndpoint.dataSource;
    logger.debug('YaleEndpoint#createAnnotationSource', source);
    return new source({prefix: this.prefix});
  }

  parseAnnotations() {
    const explorer = this.getAnnotationExplorer();
    const spec = getPageController().getConfig().extension.tagHierarchy;
    explorer.reloadAnnotationToc(spec, this.annotationsList);
  }
}
