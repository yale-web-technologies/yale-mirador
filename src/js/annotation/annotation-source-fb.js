import {annoUtil} from '../import';
import FirebaseProxy from './firebase-proxy';
import getMiradorWindow from '../mirador-window';

// Implements inteface between Joosugi annotation explorer and the annotation server
export default class AnnotationSourceFb {
  constructor() {
    const fbSettings = getMiradorWindow().getConfig().extension.firebase;
    this.fbProxy = new FirebaseProxy(fbSettings);
    this.fbKeyMap = {}; // key: annotation['@id], value: firebase key.
  }

  getLayers() {
    console.log('AnnotationSourceFb#getLayers');
    const promise = new Promise(function(resolve, reject) {
      const ref = firebase.database().ref('layers');

      ref.once('value', function (snapshot) {
        const data = snapshot.val();
        const layers = [];
        console.log('Layers:', data);
        jQuery.each(data, function (key, value) {
          layers.push(value);
        });
        resolve(layers);
      });
    });
    return promise;
  }

  getAnnotations(canvasId) {
    console.log('AnnotationSourceFb#getAnnotations canvasId: ' + canvasId);
    const _this = this;

    return new Promise((resolve, reject) => {
      const fbDfd = _this.fbProxy.getAnnosByCanvasId(canvasId);
      const annotations = [];

      fbDfd.done(function(annoInfos) {
        console.log('AnnotationSourceFb#_search annoInfos: ', annoInfos);
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
    console.log('AnnotationSourceFb#createAnnotation oaAnnotation:', oaAnnotation);
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
    console.log('AnnotationSourceFb#updateAnnotation annotation:', oaAnnotation);
    console.dir(oaAnnotation);
    
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
          console.log('Firbase update succeeded');
          resolve(oaAnnotation);
        }
      });
    });
  }

  deleteAnnotation(annotationId) {
    console.log('YaleDemoEndpoint#delete annotationId: ' + annotationId);
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
    console.log('AnnotationSourceFb#updateAnnotationListOrder');
    var combinedId = canvasId + layerId;
    var ref = firebase.database().ref('lists');
    var query = ref.orderByChild('combinedId').equalTo(combinedId);
    
    return new Promise((resolve, reject) => {
      query.once('value', function(snapshot) {
        if (snapshot.exists()) { // child with combiedId exists
          resolve();
        } else {
          console.log('ERROR updateOrder: list not found for ' + combinedId);
          reject();
        }
      });
    })
    .then(() => {
      query.once('child_added', function(snapshot, prevChildKey) {
        snapshot.ref.update({ annotationIds: annoIds});
        console.log('xxxx 1');
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
    console.log('_getTargetCanvasId canvas ID: ' + canvasId);
    return canvasId;
  }
  
  // Convert Endpoint annotation to OA
  _getAnnotationInOA(annotation) {
    var motivation = annotation.motivation;
    if (!(motivation instanceof Array)) {
      if (motivation !== 'oa:commenting') {
        console.log('ERROR YaleEndpoint#getAnnotationInOA unexpected motivation value: ', motivation, ', id: ' + annotation['@id']);
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
    //console.log('YaleEndpoint#getAnnotationInOA oaAnnotation:', oaAnnotation);
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
