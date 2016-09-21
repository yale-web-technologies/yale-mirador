import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import getMiradorWindow from '../mirador-window';
import getModalAlert from '../widgets/modal-alert';
import getErrorDialog from '../widgets/error-dialog';
import getAnnotationCache from './annotation-cache';
import CanvasToc from '../annotation/toc';
import YaleEndpointBase from './yale-endpoint-base';

export default class YaleEndpoint extends YaleEndpointBase {
  constructor(options) {
    super(options);
  }

  _search(options) {
    const _this = this;
    
    return new Promise(function(resolve, reject) {
      const canvasId = options.uri;
      //const url = _this.prefix + '/getAnnotations?includeTargetingAnnos=true&canvas_id=' + encodeURIComponent(canvasId);
      const url = _this.prefix + '/getAnnotationsViaList?canvas_id=' + encodeURIComponent(canvasId);
      console.log('YaleEndpoint#_search url: ' + url);
      _this.annotationsList = [];

      jQuery.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        headers: {
          'bearer-token': _this.bearerToken
        },
        contentType: 'application/json; charset=utf-8',
        success: function (data, textStatus, jqXHR) {
          console.log('YaleEndpoint#_search data: ');
          console.dir(data);

          var annotations = data;
          jQuery.each(annotations, function (index, value) {
            var oaAnnotation = _this.getAnnotationInOA(value.annotation);
            oaAnnotation.layerId = value.layer_id;
            _this.annotationsList.push(oaAnnotation);
          });
          resolve(data);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.log('YaleEndpoint#search error searching');
          reject();
        }
      });
    });
  }
  
  _create (oaAnnotation, successCallback, errorCallback) {
    console.log('YaleEndpoint#_create oaAnnotation:');
    console.dir(oaAnnotation);
    
    var _this = this;
    var layerId = oaAnnotation.layerId;
    var annotation = this.getAnnotationInEndpoint(oaAnnotation);
    var url = this.prefix + '/annotations';

    var request = {
      layer_id: layerId,
      annotation: annotation
    };

    //console.log('YaleEndpoint#_create request: ' + JSON.stringify(request, null, 2));

    jQuery.ajax({
      url: url,
      type: 'POST',
      dataType: 'json',
      data: JSON.stringify(request),
      contentType: 'application/json; charset=utf-8',
      success: function (data) {
        console.log('Creation was successful on the annotation server: ' + JSON.stringify(data, null, 2));
        var annotation = data;
        var oaAnnotation = _this.getAnnotationInOA(annotation);
        oaAnnotation.layerId = layerId;
        if (typeof successCallback === 'function') {
          successCallback(oaAnnotation);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        alert('Failed to create annotation: ' + textStatus);
        if (typeof errorCallback === 'function') {
          errorCallback(jqXHR, textStatus, errorThrown);
        }
      }
    });
  }
  
  _update(oaAnnotation, successCallback, errorCallback) {
    var _this = this;
    var annotation = this.getAnnotationInEndpoint(oaAnnotation);
    var url = this.prefix + '/annotations';

    console.log('YaleEndpoint#_update url: ' + url);
    
    var data = {
      layer_id: [oaAnnotation.layerId],
      annotation: annotation
    };
    
    console.log('YaleEndpoint#update payload: ' + JSON.stringify(data, null, 2));

    jQuery.ajax({
      url: url,
      type: 'PUT',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(data),
      success: function (data, textStatus, jqXHR) {
        if (typeof successCallback === 'function') {
          console.log('Update was successful: ' + JSON.stringify(data, null, 2));
          data.layerId = oaAnnotation.layerId;
          successCallback(data);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.log('YaleEndpoint#update failed for annotation:');
        console.dir(oaAnnotation);
        console.log(textStatus);
        if (typeof errorCallback === 'function') {
          errorCallback(jqXHR, textStatus, errorThrown);
        }
      }
    });
  }
  
  _deleteAnnotation (annotationId, successCallback, errorCallback) {
    console.log('YaleEndpoint#delete oa annotationId: ' + annotationId);
    var _this = this;
    var url = annotationId;
    console.log('YaleEndpoint#delete url: ' + url);

    jQuery.ajax({
      url: url,
      type: 'DELETE',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      success: function (data, textStatus, jqXHR) {
        console.log('YaleEndpoint#deleteAnnotation success data: ' + JSON.stringify(data, null, 2));
        if (typeof successCallback === 'function') {
          successCallback();
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.log('YaleEndpoint#deleteAnnotation failed for annotationId: ' + annotationId);
      }
    });
  }

  _getLayers() {
    console.log('YaleEndpoint#_getLayers');
    const _this = this;
    const promise = new Promise(function(resolve, reject) {
      const url = _this.prefix + '/layers';
      
      jQuery.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function (data, textStatus, jqXHR) {
          console.log('YaleEndpoint#getLayers data: '); 
          console.dir(data);
          //_this._layers = data;
          resolve(data);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.log('YaleEndpoint#search error retrieving layers:');
          console.log('status code: ' + jqXHR.status);
          console.log('textStatus: ' + textStatus);
          console.log('errorThrown: ' + errorThrown);
          console.log('URL: ' + url);
          if (typeof errorCallback === 'function') {
            reject(jqXHR, textStatus, errorThrown);
          }
        }
      });
    });
  }
  
  _updateOrder(canvasId, layerId, annoIds, successCallback, errorCallback) {
    /*
    console.log('canvasId: ' + canvasId);
    console.log('layerId: ' + layerId);
    jQuery.each(annoIds, function(index, value) {
      console.log(value);
    });
    */
    
    var url = this.prefix + '/resequenceList';
    var data = {
      canvas_id: canvasId,
      layer_id: layerId,
      annotation_ids: annoIds
    };
    
    jQuery.ajax({
      url: url,
      type: 'PUT',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(data),
      success: function (data, textStatus, jqXHR) {
        if (typeof successCallback === 'function') {
          console.log('Updating order was successful: ' + JSON.stringify(data, null, 2));
          successCallback(data);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.log('YaleEndpoint#updateOrder failed for request: ' + JSON.stringify(data, null, 2));
        console.log(textStatus);
        if (typeof errorCallback === 'function') {
          errorCallback(jqXHR, textStatus, errorThrown);
        }
      }
    });
  }
}
