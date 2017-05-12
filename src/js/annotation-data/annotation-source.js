import getAnnotationCache from './annotation-cache';
import getLogger from '../util/logger';
import getPageController from '../page-controller';
import getStateStore from '../state-store';

const logger = getLogger();

// Implements inteface between Joosugi annotation explorer and the annotation server
export default class AnnotationSource {
  constructor(options) {
    this.options = jQuery.extend({
      prefix: null,
      state: getStateStore()
    }, options);
    this.layers = null;
  }

  async getLayers() {
    logger.debug('AnnotationSource#getLayers');
    let layers = null;

    if (this.layers) {
      logger.debug('AnnotationSource#getLayers hit cache', this.layers);
      layers = this.layers;
    } else {
      layers = await this._getRemoteLayers();
      this._updateLayerIndex(layers);
    }

    return layers;
  }

  _getRemoteLayers() {
    return new Promise((resolve, reject) => {
      const projectId = this.options.state.getTransient('projectId');
      const disableAuthz = this.options.state.getTransient('disableAuthz');
      let url = this.options.prefix + '/layers';

      if (projectId && !disableAuthz) {
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
          this.layers = data;
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

    if (!this.options.state.getTransient('layerIndexMap')) {
      const map = {};
      let count = 0;
      layers.forEach((layer) => {
        map[layer['@id']] = count;
        ++count;
      });
      this.options.state.setTransient('layerIndexMap', count > 0 ? map : null);
    }
    return layers;
  }

  async getAnnotations(options) {
    const canvasId = options.canvasId;
    const layerId = options.layerId;
    const cache = await getAnnotationCache();
    let annotations = null;

    if (cache) {
      annotations = await cache.getAnnotationsPerCanvas(canvasId);
      logger.debug('AnnotationSource#getAnnotations from cache:', annotations);
    }

    if (!annotations) {
      annotations = await this._getRemoteAnnotations(canvasId);
      if (cache) {
        cache.setAnnotationsPerCanvas(canvasId, annotations);
      }
    }

    return layerId ? annotations.filter((anno) => anno.layerId === layerId) :
      annotations;
  }

  _getRemoteAnnotations(canvasId) {
    logger.debug('AnnotationSource#_getRemoteAnnotation canvas: ' + canvasId);
    return new Promise((resolve, reject) => {
      const url = this.options.prefix + '/getAnnotationsViaList?canvas_id=' + encodeURIComponent(canvasId);
      logger.debug('AnnotationSource#_getRemoteAnnotations url: ', url);
      const annotations = [];

      jQuery.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: (data, textStatus, jqXHR) => {
          logger.debug('AnnotationSource#_getAnnotations data: ', data);
          for (let value of data) {
            let annotation = this._getAnnotationInOA(value.annotation);
            annotation.layerId = value.layer_id;
            annotations.push(annotation);
          }
          resolve(annotations);
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
    const annotation = this._getAnnotationInEndpoint(oaAnnotation);
    const url = this.options.prefix + '/annotations';
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
        success: data => {
          logger.debug('AnnotationSource#createAnnotation creation successful on the annotation server:', data);
          const annotation = data;
          const oaAnnotation = this._getAnnotationInOA(annotation);
          oaAnnotation.layerId = layerId;
          if (cache) {
            setTimeout(() => {
              cache.invalidateAnnotation(oaAnnotation);
            }, 250);
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
    const annotation = this._getAnnotationInEndpoint(oaAnnotation);
    const url = this.options.prefix + '/annotations';
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
        success: (data, textStatus, jqXHR) => {
            logger.debug('AnnotationSource#updateAnnotation successful', data);
            const annotation = this._getAnnotationInOA(data);
            annotation.layerId = oaAnnotation.layerId;
            if (cache) {
              cache.invalidateAnnotation(annotation);
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
    const url = annotationId;

    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url: url,
        type: 'DELETE',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: (data, textStatus, jqXHR) => {
          logger.debug('AnnotationSource#deleteAnnotation success data:', data);
          if (cache) {
            cache.invalidateAnnotationId(annotationId);
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
    const url = this.options.prefix + '/resequenceList';
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
        success: (data, textStatus, jqXHR) => {
          logger.debug('AnnotationSource#updateAnnotationListOrder successful', data);
          if (cache) {
            cache.invalidateCanvasId(canvasId);
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

  // Convert Endpoint annotation to OA
  _getAnnotationInOA(annotation) {
    let motivation = annotation.motivation;
    if (!(motivation instanceof Array)) {
      if (motivation !== 'oa:commenting') {
        this.logger.error('ERROR YaleEndpoint#getAnnotationInOA unexpected motivation value: ', motivation, ', id: ' + annotation['@id']);
      }
      motivation = ['oa:commenting'];
    }

    let target = annotation.on;

    if (target.selector && target.selector['@type'] === 'oa:Choice') { // if the new (dual) mirador strategy format
      target = [target];
    }

    const oaAnnotation = {
      '@context': 'http://iiif.io/api/presentation/2/context.json',
      '@type': 'oa:Annotation',
      '@id': annotation['@id'],
      motivation: motivation,
      resource : annotation.resource,
      on: target,
      within: annotation.within,
    };

    oaAnnotation.layerId = annotation.layerId;
    return oaAnnotation;
  }

  // Converts OA Annotation to endpoint format
  _getAnnotationInEndpoint(oaAnnotation) {
    let target = oaAnnotation.on;

    // XXX temporary fix until the annotation server supports multiple targets
    if (target instanceof Array) {
      if (target.length !== 1) {
        logger.error('AnnotationSource#_getAnnotationInEndpoint unexpected target length', target.length);
      }
      target = target[0];
    }

    const annotation = {
      '@id': oaAnnotation['@id'],
      '@type': oaAnnotation['@type'],
      '@context': oaAnnotation['@context'],
      motivation: oaAnnotation.motivation,
      resource: oaAnnotation.resource,
      on: target
    };
    if (oaAnnotation.within) {
      annotation.within = oaAnnotation.within;
    }
    if (oaAnnotation.orderWeight) {
      annotation.orderWeight = oaAnnotation.orderWeight;
    }
    return annotation;
  }
}
