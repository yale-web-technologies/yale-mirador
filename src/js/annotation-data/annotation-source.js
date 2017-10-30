import {Anno} from '../import';
import getAnnotationCache from './annotation-cache';
import getApp from '../app';
import {getEndpoint} from './yale-endpoint';
import getLogger from '../util/logger';
import getModalAlert from '../widgets/modal-alert';
import getPageController from '../page-controller';
import getStateStore from '../state-store';

const logger = getLogger();

// Implements inteface between Joosugi annotation explorer and the annotation server
export default class AnnotationSource {
  constructor(options) {
    this._prefix = options.prefix;
    this._state = options.state;

    /*
    this.options = jQuery.extend({
      prefix: null,
      state: getStateStore()
    }, options);
    */
    this._layers = null;
  }

  async getLayers() {
    logger.debug('AnnotationSource#getLayers');
    let layers = null;

    if (this._layers) {
      logger.debug('AnnotationSource#getLayers hit cache', this._layers);
      layers = this._layers;
    } else {
      layers = await this._getRemoteLayers();
      this._updateLayerIndex(layers);
    }

    return layers;
  }

  _getRemoteLayers() {
    return new Promise((resolve, reject) => {
      const projectId = this._state.getSetting('auth', 'groupId');
      let url = this._prefix + '/layers';

      //if (projectId && !disableAuthz) {
      if (projectId) {
        url += '?group_id=' + projectId;
      }
      logger.debug('AnnotationSource#_getRemoteLayers url:', url);

      jQuery.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: (data, textStatus, jqXHR) => {
          logger.debug('AnnotationSource#getLayers layers: ', data);
          this._layers = data;
          resolve(data);
        },
        error: (jqXHR, textStatus, errorThrown) => {
          const msg = 'AnnotationSource#getLayers error status code: ' +
            jqXHR.status + ', textStatus: ' + textStatus +
            ', errorThrown: ' + errorThrown + ', URL: ' + url;
          logger.error(msg);
          reject(msg);
        }
      });
    });
  }

  _updateLayerIndex(layers) {
    logger.debug('AnnotationSource#_updateLayerIndex');

    if (!this._state.getTransient('layerIndexMap')) {
      const map = {};
      let count = 0;
      layers.forEach((layer) => {
        map[layer['@id']] = count;
        ++count;
      });
      this._state.setTransient('layerIndexMap', count > 0 ? map : null);
    }
    return layers;
  }

  /**
   * Options: {
   *   canvasId: <string>, // required,
   *   layerId: <string> // optional
   * }
   *
   * @param {object} options
   */
  async getAnnotations(options) {
    const canvasId = options.canvasId;
    const layerId = options.layerId;
    const cache = await getAnnotationCache();
    let annotations = null;

    await getModalAlert().show('Retrieving annotations...');

    if (cache) {
      annotations = await cache.getAnnotationsPerCanvas(canvasId);
      logger.debug('AnnotationSource#getAnnotations from cache:', annotations);
    }

    if (!annotations) {
      annotations = await this._getRemoteAnnotations(canvasId);

      if (cache) {
        await cache.setAnnotationsPerCanvas(canvasId, annotations);
      }
    }
    this._attachEndpoint(annotations);

    if (layerId) {
      annotations = annotations.filter((anno) => anno.layerId === layerId);
    }

    getModalAlert().hide();

    return annotations;
  }

  _attachEndpoint(annotations) {
    logger.debug('AnnotationSource#_attachEndpoint annotations:', annotations);
    const endpoint = getEndpoint();

    for (let anno of annotations) {
      anno.endpoint = endpoint;
    }
  }

  _detachEndpoint(annotations) {
    logger.debug('AnnotationSource#_detachEndpoint annotations:', annotations);
    for (let anno of annotations) {
      delete anno.endpoint;
    }
  }

  _getRemoteAnnotations(canvasId) {
    logger.debug('AnnotationSource#_getRemoteAnnotations canvas: ' + canvasId);
    return new Promise((resolve, reject) => {
      const url = this._prefix + '/getAnnotationsViaList?canvas_id=' + encodeURIComponent(canvasId);
      logger.debug('AnnotationSource#_getRemoteAnnotations url: ', url);
      const annotations = [];

      jQuery.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: (data, textStatus, jqXHR) => {
          logger.debug('AnnotationSource#_getRemoteAnnotations data: ', data);
          try {
            const annotations = [];

            for (let item of data) {
              let annotation = item.annotation;
              annotation.layerId = item.layer_id;
              annotations.push(this._toMiradorAnnotation(annotation));
            }
            resolve(annotations);
          } catch(e) {
            logger.error('AnnotationSource#_getRemoteAnnotations error parsing data for canvas', canvasId,
              'data:', data, 'error:', e);
            resolve([]);
          }
        },
        error: (jqXHR, textStatus, errorThrown) => {
          const msg = 'AnnotationSource#getAnnotations failed to get annotations from ' + url;
          reject(msg);
        }
      });
    });
  }

  async createAnnotation(oaAnnotation) {
    logger.debug('AnnotationSource#createAnnotation oaAnnotation:', oaAnnotation);
    const cache = await getAnnotationCache();
    const layerId = oaAnnotation.layerId;

    const annotation = this._toBackendAnnotation(oaAnnotation);

    const url = this._prefix + '/annotations';
    const request = {
      layer_id: layerId,
      annotation: annotation
    };

    logger.debug('AnnotationSource#createAnnotation payload:', request);

    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url: url,
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify(request),
        contentType: 'application/json; charset=utf-8',
        success: async data => {
          logger.debug('AnnotationSource#createAnnotation creation successful on the annotation server:', data);
          const annotation = data;
          const oaAnnotation = this._toMiradorAnnotation(annotation);
          oaAnnotation.layerId = layerId;
          oaAnnotation.endpoint = getEndpoint();
          if (cache) {
            await cache.invalidateAllCanvases();
          }
          const tocCache = getApp().getAnnotationTocCache();
          if (tocCache) {
            tocCache.invalidate();
          }
          resolve(oaAnnotation);
        },
        error: (jqXHR, textStatus, errorThrown) => {
          const msg = 'Failed to create annotation: ' + textStatus + ' ' + jqXHR.status + ' ' + errorThrown;
          logger.error(msg);
          reject(msg);
        }
      });
    });
  }

  async updateAnnotation(oaAnnotation) {
    const cache = await getAnnotationCache();
    const annotation = this._toBackendAnnotation(oaAnnotation);
    const url = this._prefix + '/annotations';
    const data = {
      layer_id: [oaAnnotation.layerId],
      annotation: annotation
    };

    logger.debug('AnnotationSource#updateAnnotation payload:', data);

    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url: url,
        type: 'PUT',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(data),
        success: async (data, textStatus, jqXHR) => {
            logger.debug('AnnotationSource#updateAnnotation successful', data);
            const annotation = this._toMiradorAnnotation(data);
            annotation.layerId = oaAnnotation.layerId;
            annotation.endpoint = getEndpoint();

            if (cache) {
              await cache.invalidateAllCanvases();
            }

            const tocCache = getApp().getAnnotationTocCache();

            if (tocCache) {
              tocCache.invalidate();
            }

            resolve(annotation);
        },
        error: (jqXHR, textStatus, errorThrown) => {
          const msg = 'Failed to update annotation: ' + textStatus + ' ' + jqXHR.status + ' ' + errorThrown;
          reject(msg);
        }
      });
    });
  }

  async deleteAnnotation(annotationId) {
    logger.debug('AnnotationSource#deleteAnnotations annotationId:', annotationId);
    const cache = await getAnnotationCache();
    const url = this._prefix + '/' + annotationId.replace(/^https?:\/\/.*?(\/.*)$/, '$1');
    //const url = annotationId;

    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url: url,
        type: 'DELETE',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: async (data, textStatus, jqXHR) => {
          logger.debug('AnnotationSource#deleteAnnotation success data:', data);
          if (cache) {
            await cache.invalidateAllCanvases();
          }
          const tocCache = getApp().getAnnotationTocCache();
          if (tocCache) {
            tocCache.invalidate();
          }
          resolve();
        },
        error: (jqXHR, textStatus, errorThrown) => {
          const msg = 'AnnotationSource#deleteAnnotation failed for annotationId: ' + annotationId;
          reject(msg);
        }
      });
    });
  }

  async updateAnnotationListOrder(canvasId, layerId, annoIds) {
    const cache = await getAnnotationCache();
    const url = this._prefix + '/resequenceList';
    const data = {
      canvas_id: canvasId,
      layer_id: layerId,
      annotation_ids: annoIds
    };

    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url: url,
        type: 'PUT',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(data),
        success: async (data, textStatus, jqXHR) => {
          logger.debug('AnnotationSource#updateAnnotationListOrder successful', data);
          if (cache) {
            await cache.invalidateAllCanvases();
          }
          const tocCache = getApp().getAnnotationTocCache();
          if (tocCache) {
            tocCache.invalidate();
          }
          resolve(data);
        },
        error: (jqXHR, textStatus, errorThrown) => {
          const msg = 'AnnotationSource#updateAnnotation failed: ' + textStatus + ' ' + jqXHR.status + ' ' + errorThrown;
          logger.error(msg);
          reject(msg);
        }
      });
    });
  }

  // Convert annotation to have format required by Mirador
  _toMiradorAnnotation(annotation) {
    const anno = jQuery.extend(true, {}, annotation);
    let target = anno.on;

    if (target && target.selector && target.selector['@type'] === 'oa:Choice') { // if the new (dual) mirador strategy format
      target = [target];
    }

    anno.on = target;

    return anno;
  }

  // Convert annotation to correct format to be saved in backend
  _toBackendAnnotation(annotation) {
    delete annotation.endpoint;
    delete annotation.target;
    delete annotation.targetedBy;

    const anno = jQuery.extend(true, {}, annotation);
    let target = anno.on;

    // XXX temporary fix until the annotation server supports multiple targets
    if (target instanceof Array) {
      if (target.length !== 1) {
        logger.error('AnnotationSource#__toBackendAnnotation unexpected target length', target.length);
      }
      target = target[0];
    }

    anno.target = target;

    return anno;
  }
}
