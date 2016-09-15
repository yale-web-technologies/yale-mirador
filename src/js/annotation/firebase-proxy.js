export default class FirebaseProxy {
  constructor(settings) {
    var config = {
      apiKey: settings.apiKey,
      authDomain: settings.authDomain,
      databaseURL: settings.databaseUrl,
      storageBuket: settings.storageBuket
    };
    firebase.initializeApp(config);
  }
  
  getAnnosByCanvasId(canvasId) {
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
  
  addAnno(annotation, layerId) {
    var canvasId = this._getTargetCanvasId(annotation);
    var ref = firebase.database().ref('annotations');
    var annoObj = { 
      canvasId: canvasId,
      layerId: layerId,
      annotation: annotation
    };
    annoObj.id = annotation['@id'];
    var annoRef = ref.push(annoObj);
    this.addAnnoToList(annotation, canvasId, layerId);
    return annoRef.key;
  }
  
  addAnnoToList(annotation, canvasId, layerId) {
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
  
  deleteAnnoFromList(annoId) {
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
  
  deleteAnnoFromListExcludeCanvasLayer(annotation, canvasId, layerId) {
    console.log('FirebaseProxy#_fbDeleteAnnoFromListExcludeCanvasLayer');
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
}