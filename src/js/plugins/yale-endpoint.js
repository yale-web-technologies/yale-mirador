import session from '../session';
import getMiradorProxy from '../mirador-proxy';
import CanvasToc from '../annotation/toc';
import getMiradorWindow from '../mirador-window';
import getModalAlert from '../widgets/modal-alert';
import getErrorDialog from '../widgets/error-dialog';

(function ($) {
  'use strict';

  $.YaleEndpoint = function (options) {
    jQuery.extend(this, {
      annotationLayers: [],
      annotationsList: [],
      dfd: null,
      imagesList: null,
      prefix: null,
      windowID: null,
      canvasToc: null
    }, options);
    
    this.init();
  };

  $.YaleEndpoint.prototype = {

    init: function() {
    },
    
    getCanvasToc: function() {
      return this.canvasToc;
    },
    
    search: function(options, successCallback, errorCallback) {
      console.log('YaleEndpoint#search options: ' + JSON.stringify(options));
      getModalAlert().show();
      
      const _this = this;
      const layersDfd = jQuery.Deferred();
      let annosDfd = jQuery.Deferred();
      
      console.dir(this.annotationLayers);
      if (this.annotationLayers.length < 1) {
        this.getLayers(layersDfd);
      } else {
        layersDfd.resolve(null, true);
      }
      
      layersDfd.done(function(layers, pass) {
        if (!pass) {
          _this.annotationLayers = layers;
        }
        _this._search(options, annosDfd);
      });
      layersDfd.fail(function(xhr) {
        getErrorDialog().show('layers');
      });
      
      annosDfd.done(function() {
        _this.dfd.resolve(true);
        if (typeof successCallback === 'function') {
          successCallback();
        }
      });
      annosDfd.fail(function() {
        getErrorDialog().show('annotations');
        _this.dfd.reject();
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
      });
      annosDfd.always(function() {
        getModalAlert().hide();
      });
    },

    _search: function(options, dfd) {
      const _this = this;
      const canvasId = options.uri;
      //const url = this.prefix + '/getAnnotations?includeTargetingAnnos=true&canvas_id=' + encodeURIComponent(canvasId);
      const url = this.prefix + '/getAnnotationsViaList?canvas_id=' + encodeURIComponent(canvasId);
      console.log('YaleEndpoint#_search url: ' + url);
      this.annotationsList = [];

      jQuery.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        headers: {
          'bearer-token': this.bearerToken
        },
        contentType: 'application/json; charset=utf-8',
        success: function (data, textStatus, jqXHR) {
          console.log('YaleEndpoint#search data: ');
          console.dir(data);

          var annotations = data;
          jQuery.each(annotations, function (index, value) {
            var oaAnnotation = _this.getAnnotationInOA(value.annotation);
            oaAnnotation.layerId = value.layer_id;
            _this.annotationsList.push(oaAnnotation);
          });
          dfd.resolve();
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.log('YaleEndpoint#search error searching');
          dfd.reject();
        }
      });
    },
    
    create: function (oaAnnotation, successCallback, errorCallback) {
      if (this.userAuthorize('create', oaAnnotation)) {
        this._create(oaAnnotation, successCallback, errorCallback);
      } else {
        console.log('YaleEndpoint#create user not authorized');
        getErrorDialog().show('authz_create');
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
      }
    },

    _create: function (oaAnnotation, successCallback, errorCallback) {
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
    },
    
    update: function (oaAnnotation, successCallback, errorCallback) {
      if (this.userAuthorize('update', oaAnnotation)) {
        this._update(oaAnnotation, successCallback, errorCallback);
      } else {
        console.log('YaleEndpoint#update user not authorized');
        getErrorDialog().show('authz_update');
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
      }
    },

    _update: function (oaAnnotation, successCallback, errorCallback) {
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
    },
    
    deleteAnnotation: function (annotationId, successCallback, errorCallback) {
      if (this.userAuthorize('delete', null)) {
        this._deleteAnnotation(annotationId, successCallback, errorCallback);
      } else {
        console.log('YaleEndpoint#delete user not authorized');
        getErrorDialog().show('authz_update');
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
      }
    },

    _deleteAnnotation: function (annotationId, successCallback, errorCallback) {
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
    },

    set: function (prop, value, options) {
      console.log('YaleEndpoint#set prop: ' + prop + ', value: ' + value + ', options: ' + JSON.stringify(options));
      if (options) {
        this[options.parent][prop] = value;
      } else {
        this[prop] = value;
      }
    },
    
    getLayers: function (dfd) {
      console.log('YaleEndpoint#getLayers');
      var _this = this;
      var url = this.prefix + '/layers';
      
      jQuery.ajax({
        url: url,
        type: 'GET',
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function (data, textStatus, jqXHR) {
          console.log('YaleEndpoint#getLayers data: '); 
          console.dir(data);
          dfd.resolve(data);
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.log('YaleEndpoint#search error retrieving layers:');
          console.log('status code: ' + jqXHR.status);
          console.log('textStatus: ' + textStatus);
          console.log('errorThrown: ' + errorThrown);
          console.log('URL: ' + url);
          if (typeof errorCallback === 'function') {
            dfd.reject(jqXHR, textStatus, errorThrown);
          }
        }
      });
    },
    
    getLayerById: function(id) {
      jQuery.each(this.annotationLayers, function(index, value) {
        if (id === value['@id']) {
          return value;
        }
      });
      return null;
    },
    
    updateOrder: function(canvasId, layerId, annoIds, successCallback, errorCallback) {
      if (this.userAuthorize('update', null)) {
        this._updateOrder(canvasId, layerId, annoIds, successCallback, errorCallback);
      } else {
        console.log('YaleEndpoint#update user not authorized');
        getErrorDialog().show('authz_update');
        if (typeof errorCallback === 'function') {
          errorCallback();
        }
      }
    },
    
    _updateOrder: function(canvasId, layerId, annoIds, successCallback, errorCallback) {
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
    },

    userAuthorize: function (action, annotation) {
      return false;
      if (action === 'create' || action === 'update' || action === 'delete') {
        return session.isEditor();
      } else {
        return true;
      }
    },
    
    // Convert Endpoint annotation to OA
    getAnnotationInOA: function(annotation) {
      var motivation = annotation.motivation;
      if (!(motivation instanceof Array)) {
        if (motivation !== 'oa:commenting') {
          //console.log('ERROR YaleEndpoint#getAnnotationInOA unexpected motivation value: ' + motivation + ', id: ' + annotation['@id']);
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
        //annotatedBy: annotatedBy,
        //annotatedAt: annotation.created,
        //serializedAt: annotation.updated,
        //permissions: annotation.permissions,
        endpoint: this
      };

      //console.log('YaleEndpoint#getAnnotationInOA oaAnnotation:');
      //console.dir(oaAnnotation);
      return oaAnnotation;
    },

    // Converts OA Annotation to endpoint format
    getAnnotationInEndpoint: function(oaAnnotation) {
      var annotation = {
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
    },
    
    parseAnnotations: function() {
      this.annotationsList = getMiradorProxy().getFirstWindow().annotationsList;
      var spec = getMiradorWindow().getConfig().extension.tagHierarchy;
      this.canvasToc = new CanvasToc(spec, this.annotationsList);
      console.log('YaleEndpoint#parseAnnotations canvasToc:');
      console.dir(this.canvasToc.annoHierarchy);
    }

  };

})(window.Mirador);
