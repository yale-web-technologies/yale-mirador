import annoUtil from '../annotation/anno-util';
import session from '../session';
import YaleEndpointBase from './yale-endpoint-base';
import FirebaseProxy from './firebase-proxy';

// Endpoint for FireBase containing dummy data for development/testing
export default class YaleDemoEndpoint extends YaleEndpointBase {
  constructor(options) {
    super(options);
  }

  init() {
    super.init();
    console.log('YaleDemoEndpoint#init');
    var _this = this;
    this.fbKeyMap = {}; // key: annotation['@id], value: firebase key.
    
    var fbSettings = session.getServerSettings().firebase;
    this.fbProxy = new FirebaseProxy(fbSettings);
  }
  
  _search(canvasId) {
    const _this = this;
    
    return new Promise(function(resolve, reject) {
      const fbDfd = _this.fbProxy.getAnnosByCanvasId(canvasId);
      const annotations = [];

      fbDfd.done(function(annoInfos) {
        console.log('YaleDemoEndpoint#_search annoInfos: ');
        console.dir(annoInfos);
        jQuery.each(annoInfos, function(index, annoInfo) {
          var oaAnnotation = _this.getAnnotationInOA(annoInfo.annotation);
          oaAnnotation.layerId = annoInfo.layerId;
          _this.fbKeyMap[oaAnnotation['@id']] = annoInfo.fbKey;
          annotations.push(oaAnnotation);
        });
        console.log('_this.annotationsList: ');
        console.dir(_this.annotationsList);
        resolve(annotations);
      });
    });
  }

  _create(oaAnnotation, successCallback, errorCallback) {
    console.log('YaleDemoEndpoint#_create oaAnnotation:');
    console.dir(oaAnnotation);

    var layerId = oaAnnotation.layerId;
    var annotation = this.getAnnotationInEndpoint(oaAnnotation);

    var annoId = Mirador.genUUID();
    annotation['@id'] = annoId;
    
    var fbKey = this.fbProxy.addAnno(annotation, layerId);
    this.fbKeyMap[annoId] = fbKey;

    if (typeof successCallback === 'function') {
      oaAnnotation['@id'] = annoId;
      oaAnnotation.endpoint = this;
      successCallback(oaAnnotation);
    } else {
      console.log('YaleDemoEndpoint#create no success callback');
    }
  }
  
  _update(oaAnnotation, successCallback, errorCallback) {
    console.log('YaleDemoEndpoint#_update oaAnnotation:');
    console.dir(oaAnnotation);
    
    var _this = this;
    var canvasId = this._getTargetCanvasId(oaAnnotation);
    var layerId = oaAnnotation.layerId;
    var annotation = this.getAnnotationInEndpoint(oaAnnotation);
    var fbKey = this.fbKeyMap[annotation['@id']];
    var ref = firebase.database().ref('/annotations/' + fbKey);
    
    ref.update({ annotation: annotation, layerId: layerId }, function (error) {
      if (error) {
        console.log('Update failed.');
      } else {
        // Delete from all lists except for this canvas/layer.
        _this.fbProxy.deleteAnnoFromListExcludeCanvasLayer(annotation, canvasId, layerId);
        _this.fbProxy.addAnnoToList(annotation, canvasId, layerId);
        console.log('Update succeeded.');
        if (typeof successCallback === 'function') {
          successCallback(oaAnnotation);
        }
      }
    });
  }

  _deleteAnnotation(annotationId, successCallback, errorCallback) {
    console.log('YaleDemoEndpoint#delete annotationId: ' + annotationId);
    var _this = this;
    var fbKey = this.fbKeyMap[annotationId];
    var ref = firebase.database().ref('annotations/' + fbKey);
    ref.remove(function (error) {
      if (error) {
        console.log('ERROR delete failed for annotation id: ' + annotationId);
        if (typeof successCallback === 'function') {
          errorCallback();
        }
      } else {
        _this.fbProxy.deleteAnnoFromList(annotationId);
        if (typeof successCallback === 'function') {
          successCallback();
        }
      }
    });
  }

  _getLayers() {
    console.log('YaleDemoEndpoint#_getLayers');
    const promise = new Promise(function(resolve, reject) {
      const ref = firebase.database().ref('layers');
      
      ref.once('value', function (snapshot) {
        var data = snapshot.val();
        
        console.log('Layers: ' + JSON.stringify(data, null, 2));
        
        var layers = [];
        
        jQuery.each(data, function (key, value) {
          layers.push(value);
        });
        
        resolve(layers);
      });
    });
    return promise;
  }
  
  _updateOrder(canvasId, layerId, annoIds, successCallback, errorCallback) {
    jQuery.each(annoIds, function(index, value) {
      console.log(value);
    });
    
    var dfd = jQuery.Deferred();
    var combinedId = canvasId + layerId;
    var ref = firebase.database().ref('lists');
    var query = ref.orderByChild('combinedId').equalTo(combinedId);
    
    query.once('value', function(snapshot) {
      if (snapshot.exists()) { // child with combiedId exists
        dfd.resolve();
      } else {
        console.log('ERROR updateOrder: list not found for ' + combinedId);
        dfd.reject();
      }
    });
      
    dfd.done(function() {
      query.once('child_added', function(snapshot, prevChildKey) {
        snapshot.ref.update({ annotationIds: annoIds});
      });
      if (typeof successCallback === 'function') {
        successCallback();
      }
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
}
