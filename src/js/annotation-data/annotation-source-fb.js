import {annoUtil} from '../import';
import FirebaseProxy from './firebase-proxy';
import getLogger from '../util/logger';
import getPageController from '../page-controller';

// Implements inteface between Joosugi annotation explorer and the annotation server
export default class AnnotationSourceFb {
  constructor() {
    this.logger = getLogger();
    const fbSettings = getPageController().getConfig().extension.firebase;
    this.fbProxy = new FirebaseProxy(fbSettings);
    this.fbKeyMap = {}; // key: annotation['@id], value: firebase key.
  }

  getLayers() {
    const _this = this;
    this.logger.debug('AnnotationSourceFb#getLayers');
    const promise = new Promise(function(resolve, reject) {
      const ref = firebase.database().ref('layers');

      ref.once('value', function (snapshot) {
        const data = snapshot.val();
        const layers = [];
        _this.logger.debug('Layers:', data);
        jQuery.each(data, function (key, value) {
          layers.push(value);
        });
        resolve(layers);
      });
    });
    return promise;
  }

  getAnnotations(canvasId) {
    this.logger.debug('AnnotationSourceFb#getAnnotations canvasId:', canvasId);
    const _this = this;

    return new Promise((resolve, reject) => {
      const fbDfd = _this.fbProxy.getAnnosByCanvasId(canvasId);
      const annotations = [];

      fbDfd.done(function(annoInfos) {
        _this.logger.debug('AnnotationSourceFb#_search annoInfos:', annoInfos);
        jQuery.each(annoInfos, function(index, annoInfo) {
          var oaAnnotation = _this._getAnnotationInOA(annoInfo.annotation);
          oaAnnotation.layerId = annoInfo.layerId;
          _this.fbKeyMap[oaAnnotation['@id']] = annoInfo.fbKey;
          annotations.push(oaAnnotation);
        });
        resolve(annotations);
      });
    });
  }

  createAnnotation(oaAnnotation) {
    this.logger.debug('AnnotationSourceFb#createAnnotation oaAnnotation:', oaAnnotation);
    const _this = this;
    const layerId = oaAnnotation.layerId;
    const annotation = this._getAnnotationInEndpoint(oaAnnotation);
    const annoId = Mirador.genUUID();
    annotation['@id'] = annoId;
    const canvasIds = annoUtil.getTargetCanvasIds(annotation, this.annotationsList);
    const canvasId = canvasIds[0];
    const fbKey = this.fbProxy.addAnno(annotation, canvasId, layerId);
    this.fbKeyMap[annoId] = fbKey;

    return new Promise((resolve, reject) => {
      oaAnnotation['@id'] = annoId;
      resolve(oaAnnotation);
    });
  }

  updateAnnotation(oaAnnotation) {
    this.logger.debug('AnnotationSourceFb#updateAnnotation annotation:', oaAnnotation);

    var _this = this;
    var canvasId = this._getTargetCanvasId(oaAnnotation);
    var layerId = oaAnnotation.layerId;
    var annotation = this._getAnnotationInEndpoint(oaAnnotation);
    var fbKey = this.fbKeyMap[annotation['@id']];
    var ref = firebase.database().ref('/annotations/' + fbKey);

    return new Promise((resolve, reject) => {
      ref.update({ annotation: annotation, layerId: layerId }, function (error) {
        if (error) {
          const msg = 'ERROR: Firebase update failed';
          reject(msg);
        } else {
          // Delete from all lists except for this canvas/layer.
          _this.fbProxy.deleteAnnoFromListExcludeCanvasLayer(annotation, canvasId, layerId);
          _this.fbProxy.addAnnoToList(annotation, canvasId, layerId);
          _this.logger.debug('Firbase update succeeded');
          resolve(oaAnnotation);
        }
      });
    });
  }

  deleteAnnotation(annotationId) {
    this.logger.debug('YaleDemoEndpoint#delete annotationId:' + annotationId);
    const _this = this;
    const fbKey = this.fbKeyMap[annotationId];
    const ref = firebase.database().ref('annotations/' + fbKey);

    return new Promise((resolve, reject) => {
      ref.remove(function (error) {
        if (error) {
          const msg = 'ERROR delete failed for annotation id: ' + annotationId;
          reject(msg);
        } else {
          _this.fbProxy.deleteAnnoFromList(annotationId);
          resolve();
        }
      });
    });
  }

  updateAnnotationListOrder(canvasId, layerId, annoIds) {
    this.logger.debug('AnnotationSourceFb#updateAnnotationListOrder');
    const _this = this;
    const combinedId = canvasId + layerId;
    const ref = firebase.database().ref('lists');
    const query = ref.orderByChild('combinedId').equalTo(combinedId);

    return new Promise((resolve, reject) => {
      query.once('value', function(snapshot) {
        if (snapshot.exists()) { // child with combiedId exists
          resolve();
        } else {
          _this.logger.debug('ERROR updateOrder: list not found for', combinedId);
          reject();
        }
      });
    })
    .then(() => {
      query.once('child_added', function(snapshot, prevChildKey) {
        snapshot.ref.update({ annotationIds: annoIds});
      });
    });
  }

  _getTargetCanvasId(annotation) {
    var targetAnno = null;

    if (annotation['@type'] === 'oa:Annotation') {
      targetAnno = annoUtil.findFinalTargetAnnotation(annotation, this.annotationsList);
    } else {
      targetAnno = annotation;
    }

    var canvasId = targetAnno.on.full;
    this.logger.debug('_getTargetCanvasId canvas ID:', canvasId);
    return canvasId;
  }

  // Convert Endpoint annotation to OA
  _getAnnotationInOA(annotation) {
    var motivation = annotation.motivation;
    if (!(motivation instanceof Array)) {
      if (motivation !== 'oa:commenting') {
        this.logger.error('YaleEndpoint#getAnnotationInOA unexpected motivation value: ', motivation, ', id: ' + annotation['@id']);
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
    };
    oaAnnotation.layerId = annotation.layerId;
    return oaAnnotation;
  }

  // Converts OA Annotation to endpoint format
  _getAnnotationInEndpoint(oaAnnotation) {
    const annotation = {
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
}
