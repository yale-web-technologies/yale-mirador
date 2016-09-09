import annoUtil from '../annotation/anno-util';
import session from '../session';
import YaleEndpoint from './yale-endpoint';

// Endpoint for FireBase containing dummy data for development/testing
export default class YaleDemoEndpoint extends YaleEndpoint {
  constructor(options) {
    super(options);
  }

  init() {
    console.log('YaleDemoEndpoint#init');
    var _this = this;
    this.fbKeyMap = {}; // key: annotation['@id], value: firebase key.
    this.initFirebase();
  }
  
  initFirebase() {
    var settings = session.getServerSettings().firebase;
    var config = {
      apiKey: settings.apiKey,
      authDomain: settings.authDomain,
      databaseURL: settings.databaseUrl,
      storageBuket: settings.storageBuket
    };
    firebase.initializeApp(config);
  }
  
  _search(options, dfd) {
    var _this = this;
    var canvasId = options.uri;
    var fbDfd = this._fbGetAnnosByCanvasId(canvasId);
    this.annotationsList = [];

    fbDfd.done(function(annoInfos) {
      console.log('YaleDemoEndpoint#_search annoInfos: ');
      console.dir(annoInfos);
      jQuery.each(annoInfos, function(index, annoInfo) {
        var oaAnnotation = _this.getAnnotationInOA(annoInfo.annotation);
        oaAnnotation.layerId = annoInfo.layerId;
        oaAnnotation.endpoint = _this;
        _this.fbKeyMap[oaAnnotation['@id']] = annoInfo.fbKey;
        _this.annotationsList.push(oaAnnotation);
      });
      console.log('_this.annotationsList: ');
      console.dir(_this.annotationsList);
      dfd.resolve();
    });
  }

  _create(oaAnnotation, successCallback, errorCallback) {
    console.log('YaleDemoEndpoint#_create oaAnnotation:');
    console.dir(oaAnnotation);

    var layerId = oaAnnotation.layerId;
    var annotation = this.getAnnotationInEndpoint(oaAnnotation);

    var annoId = Mirador.genUUID();
    annotation['@id'] = annoId;
    
    var fbKey = this._fbAddAnno(annotation, layerId);
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
        _this._fbDeleteAnnoFromListExcludeCanvasLayer(annotation, canvasId, layerId);
        _this._fbAddAnnoToList(annotation, canvasId, layerId);
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
        _this._fbDeleteAnnoFromList(annotationId);
        if (typeof successCallback === 'function') {
          successCallback();
        }
      }
    });
  }

  getLayers(dfd) {
    console.log('YaleDemoEndpoint#getLayers');
    var ref = firebase.database().ref('layers');
    
    ref.once('value', function (snapshot) {
      var data = snapshot.val();
      
      console.log('Layers: ' + JSON.stringify(data, null, 2));
      
      var layers = [];
      
      jQuery.each(data, function (key, value) {
        layers.push(value);
      });
      
      dfd.resolve(layers);
    });
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
  
  _fbGetAnnosByCanvasId(canvasId) {
    var dfd = jQuery.Deferred();
    var ref =  firebase.database().ref('annotations');
    var fbAnnos = {};
    var fbKeys = {};
    var annoInfos = [];
    
    ref.once('value', function(snapshot) {
      var data = snapshot.val() || [];
      jQuery.each(data, function(key, value) {
        if (value.canvasId === canvasId) {
          var annoId = value.annotation['@id'];
          fbKeys[annoId] = key;
          fbAnnos[annoId] = value.annotation;
        }
      });
      var listsRef = firebase.database().ref('lists');
      listsRef.once('value', function(snapshot) {
        var listObjs = snapshot.val() || [];
        jQuery.each(listObjs, function(key, listObj) {
          if (listObj.canvasId === canvasId) {
            var annotationIds = listObj.annotationIds || [];
            jQuery.each(annotationIds, function(index, annotationId) {
              var fbKey = fbKeys[annotationId];
              var anno = fbAnnos[annotationId];
              if (anno) {
                annoInfos.push({
                  fbKey: fbKey,
                  annotation: anno,
                  layerId: listObj.layerId
                });
              } else {
                console.log("ERROR anno in the list doesn't exist: " + annotationId);
              }
            });
          }
        });
        dfd.resolve(annoInfos);
      });
      
    });
    return dfd;
  }
  
  _fbAddAnno(annotation, layerId) {
    var canvasId = this._getTargetCanvasId(annotation);
    var ref = firebase.database().ref('annotations');
    var annoObj = { 
      canvasId: canvasId,
      layerId: layerId,
      annotation: annotation
    };
    annoObj.id = annotation['@id'];
    var annoRef = ref.push(annoObj);
    this._fbAddAnnoToList(annotation, canvasId, layerId);
    return annoRef.key;
  }
  
  _fbAddAnnoToList(annotation, canvasId, layerId) {
    var dfd = jQuery.Deferred();
    var annoId = annotation['@id'];
    var combinedId = canvasId + layerId;
    var ref = firebase.database().ref('lists');
    var query = ref.orderByChild('combinedId').equalTo(combinedId);
    
    query.once('value', function(snapshot) {
      if (snapshot.exists()) { // child with combiedId exists
        dfd.resolve(true);
      } else {
        dfd.resolve(false);
      }
    });
      
    dfd.done(function(matched) {
      if (matched) {
        query.once('child_added', function(snapshot, prevChildKey) {
          var data = snapshot.val();
          var ref = snapshot.ref;
          data.annotationIds = data.annotationIds || [];
          if (jQuery.inArray(annoId, data.annotationIds) === -1) {
            data.annotationIds.push(annoId);
            ref.update({ annotationIds: data.annotationIds});
          }
        });
      } else {
        ref.push({
          combinedId: combinedId,
          canvasId: canvasId,
          layerId: layerId,
          annotationIds: [ annoId ]
        });
      }
    });
  }
  
  _fbDeleteAnnoFromList(annoId) {
    var ref = firebase.database().ref('lists');
    ref.on('child_added', function(snapshot) {
      var data = snapshot.val();
      var index = data.annotationIds ? data.annotationIds.indexOf(annoId) : -1;
      if (index > -1) {
        data.annotationIds.splice(index, 1);
        snapshot.ref.update({ annotationIds: data.annotationIds });
      }
    });
  }
  
  _fbDeleteAnnoFromListExcludeCanvasLayer(annotation, canvasId, layerId) {
    console.log('YaleDemoEndpoint#_fbDeleteAnnoFromListExcludeCanvasLayer');
    var annoId = annotation['@id'];
    var combinedId = canvasId + layerId;
    var ref = firebase.database().ref('lists');
    
    ref.once('value', function(snapshot) {
      var data = snapshot.val() || [];
      snapshot.forEach(function(childSnapshot) {
        var childRef = childSnapshot.ref;
        var childKey = childSnapshot.key;
        var childData = childSnapshot.val();
        if (childData.combinedId !== combinedId) {
          var index = childData.annotationIds ? childData.annotationIds.indexOf(annoId) : -1;
          if (index > -1) {
            childData.annotationIds.splice(index, 1);
            childRef.update({ annotationIds: childData.annotationIds });
          }
        }
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
}
