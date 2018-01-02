import AnnotationSource from './annotation-source';
import getApp from 'app';
import getErrorDialog from 'widgets/error-dialog';
import getLogger from 'util/logger';
import getMiradorProxyManager from 'mirador-proxy/mirador-proxy-manager';
import getModalAlert from 'widgets/modal-alert';
import getPageController from 'page-controller';
import session from 'session';
import util from 'util/util';

const logger = getLogger();
let _explorer = null;
let _instances = [];

function getEndpoint() {
  logger.debug('getEndpoint _instances:', _instances.length, _instances);
  return _instances[0];
}

class YaleEndpoint {
  constructor(options) {
    this.dfd = options.dfd; // set also by Mirador using set(), so cannot change name
    this._explorer = options.explorer || getApp().getAnnotationExplorer();
    this._error = options.errorDialog || getErrorDialog();
    this.annotationsList = []; // used by Mirador, thus public
    _instances.push(this);
  }

  async search(options) {
    logger.debug('YaleEndpoint#search options:', options);
    let error = false;
    const canvasId = options.uri;

    const annotations = await this._explorer.getAnnotations({ canvasId: canvasId })
    .catch(e => {
      logger.error('YaleEndpoint#search', e);
      error = true;
      this.annotationsList = [];
      if (e.code === 403) {
        this._error.show(e.code, "Failed to retrieve annotations: user doesn't have permission to read");
      } else {
        this._error.show(e.code, 'Failed to retrieve annotations', true);
      }
    });
    logger.debug('YaleEndpoint#search got annotations:', this.annotationsList);
    if (error) {
      this.dfd.reject();
      return;
    }

    try {
      this.annotationsList = annotations;
      this.dfd.resolve(true);
    } catch (e) {
      logger.error('YaleEndpoint#search dfd.resolve failed - ', e);
    }
    getModalAlert().hide();
  }

  async create(oaAnnotation, successCallback, errorCallback) {
    const _this = this;
    let error = false;

    if (this.userAuthorize('create', oaAnnotation)) {
      const annotation = await this._create(oaAnnotation)
      .catch(e => {
        error = true;
        if (e.code === 403) {
          this._error.show(e.code, "Failed to create annotation: user doesn't have permission to create")
        } else {
          this._error.show(e.code, 'Failed to create annotation', true);
        }
      });

      if (error) {
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
        return;
      }

      if (typeof successCallback === 'function') {
        try {
          successCallback(annotation);
        } catch (e) {
          logger.error('ERROR YaleEndpoint#create successCallback failed:', e);
          if (typeof errorCallback === 'function') {
            errorCallback();
          }
        }
      }
    } else {
      this._error.show(-1, 'Not authorized to create');
      if (typeof errorCallback === 'function') {
        errorCallback();
      }
    }
  }

  async _create(oaAnnotation) {
    logger.debug('YaleEndpoint#_create oaAnnotation:', oaAnnotation);
    const _this = this;

    const annotation = this._explorer.createAnnotation(oaAnnotation)
    .catch(e => {
      logger.error('YaleEndpoint#_create createAnnotation failed', e);
      throw e;
    });

    _this.annotationsList.push(annotation);
    return annotation
  }

  async update(oaAnnotation, successCallback, errorCallback) {
    const _this = this;
    const annotationId = oaAnnotation['@id'];
    let error = false;

    if (this.userAuthorize('update', oaAnnotation)) {
      const annotation = await this._explorer.updateAnnotation(oaAnnotation)
      .catch(e => {
        error = true;
        if (e.code === 403) {
          this._error.show(e.code, "Failed to update annotation: user doesn't have permission to update")
        } else {
          this._error.show(e.code, 'Failed to update annotation', true);
        }
      });

      this._attachEndpoint();

      if (error) {
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
        return;
      }

      _this.annotationsList.forEach((anno, index) => {
        if (anno['@id'] === annotationId) {
          _this.annotationsList[index] = oaAnnotation;
        }
      });

      if (typeof successCallback === 'function') {
        successCallback(annotation);
      }
    } else {
      this._error.show(-1, 'Not authorized to update');
      if (typeof errorCallback === 'function') {
        errorCallback();
      }
    }
  }

  async deleteAnnotation(annotationId, successCallback, errorCallback) {
    logger.debug('YaleEndpoint#deleteAnnotation annotationId: ' + annotationId);
    const _this = this;
    let error = false;

    if (this.userAuthorize('delete', null)) {
      await this._explorer.deleteAnnotation(annotationId)
      .catch(e => {
        error = true;
        if (e.code === 403) {
          this._error.show(e.code, "Failed to delete annotation: user doesn't have permission to delete")
        } else {
          this._error.show(e.code, 'Failed to delete annotation', true);
        }
      });

      if (error) {
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
        return;
      }

      this.annotationsList = _this.annotationsList.filter(anno => anno['@id'] !== annotationId);

      if (typeof successCallback === 'function') {
        successCallback();
      }
    } else {
       logger.info('YaleEndpoint#delete user not authorized');
       this._error.show(-1, 'Not authorized to delete');
       if (typeof errorCallback === 'function') {
         errorCallback();
       }
    }
  }

  async getLayers() {
    logger.debug('YaleEndpoint#getLayers');
    return this._explorer.getLayers();
  }

  async updateOrder(canvasId, layerId, annoIds, successCallback, errorCallback) {
    logger.debug('YaleEndpoint#updateOrder canvasId:', canvasId, 'layerId:', layerId, 'annoIds:', annoIds);
    const _this = this;

    if (this.userAuthorize('update', null)) {
      await this._explorer.updateAnnotationListOrder(canvasId, layerId, annoIds)
      .catch(e => {
        error = true;
        if (e.code === 403) {
          this._error.show(e.code, "Failed to delete annotation: user doesn't have permission to delete")
        } else {
          this._error.show(e.code, 'Failed to delete annotation', true);
        }
      });

      if (error) {
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
        return;
      }

      if (typeof successCallback === 'function') {
        successCallback();
      }
    } else {
       logger.info('YaleEndpoint#updateOrder user not authorized');
       this._error.show(-1, 'Not authorized to update');
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

  set(prop, value, options) {
    logger.debug('YaleEndpoint#set prop:', prop, ', value:', value, ', options:', options);
    if (options) {
      this[options.parent][prop] = value;
    } else {
      this[prop] = value;
    }
  }

  _attachEndpoint() {
    for (let anno of this.annotationsList) {
      anno.endpoint = this;
    }
  }
}

export {YaleEndpoint, getEndpoint};
