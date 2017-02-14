import {annoUtil} from '../import';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';

class YmAnnotationSelector {
  
  constructor(elem) {
    const _this = this;
    
    this.logger = getLogger();
    this.elem = elem;
    elem.modal({
      onApprove: function(elem) {
        _this.dfd.resolve(_this.selectedAnnotation);
      }
    });
  }
  
  open(windowId) {
    const _this = this;
    const miradorProxyManager = getMiradorProxyManager();
    const windowProxy = miradorProxyManager.getWindowProxyById(windowId);
    const manifest = windowProxy.getManifest();
    
    this.dfd = jQuery.Deferred();
    
    this.currentCanvasId = windowProxy.getCurrentCanvasId();
    this.endpoint = windowProxy.getEndPoint();
    
    this.elem.html(template());
    this.contentGrid = this.elem.find('.grid');
    this.filtersPanel = this.elem.find('.filters');
    this.canvasesPanel = this.elem.find('.canvases');
    this.layersPanel = this.elem.find('.layers');
    this.annosPanel = this.elem.find('.annos');
    
    this.selectedAnnotation = null;
    
    this.loadCanvases(manifest);
    this.loadLayers();
    this.loadAnnotations(windowProxy.getAnnotationsList());
    this.elem.modal('show');
    this.setDimensions();
    setTimeout(function() {
      _this.scrollToCurrentCanvas(windowProxy);
    }, 500);
    return this.dfd;
  }
  
  refresh(options) {
    const _this = this;
    
    if (options.newCanvasId && options.newCanvasId !== options.oldCanvasId) {
      this.refreshCanvasesPanel(options.oldCanvasId, options.newCanvasId);
      const dfd = jQuery.Deferred();
      this.endpoint.set('dfd', dfd);
      this.endpoint.search({ uri: options.newCanvasId });
      dfd.done(function(loaded) {
        _this.loadAnnotations(_this.endpoint.annotationsList);
      });
    } else if (options.newLayerId && options.newLayerId !== options.oldLayerId) {
      this.refreshLayersPanel(options.oldLayerId, options.newLayerId);
      this.loadAnnotations(this.endpoint.annotationsList);
    }
  }
  
  refreshCanvasesPanel(oldCanvasId, newCanvasId) {
    const canvasElems = this.canvasesPanel.find('.canvas');
    canvasElems.each(function(index, canvasElem) {
      const elem = $(canvasElem);
      const canvasId = elem.data('canvasId');
      if (canvasId === oldCanvasId) {
        elem.removeClass('selected');
      }
      if (canvasId === newCanvasId) {
        elem.addClass('selected');
      }
    });
  }
  
  refreshLayersPanel(oldLayerId, newLayerId) {
    const layerElems = this.layersPanel.find('.layer');
    
    layerElems.each(function(index, layerElem) {
      const elem = $(layerElem);
      const layerId = elem.data('layerId');
      if (layerId === oldLayerId) {
        elem.removeClass('selected');
      }
      if (layerId === newLayerId) {
        elem.addClass('selected');
      }
    });
  }
  
  refreshAnnosPanel(oldAnnoId, newAnnoId) {
    const annoElems = this.annosPanel.find('.anno');
    
    annoElems.each(function(index, annoElem) {
      const elem = $(annoElem);
      const annoId = elem.data('annotation')['@id'];
      if (annoId === oldAnnoId) {
        elem.removeClass('selected');
      }
      if (annoId === newAnnoId) {
        elem.addClass('selected');
      }
    });
  }
  
  loadCanvases(manifest) {
    const _this = this;
    const canvases = manifest.getCanvases();
    
    jQuery.each(canvases, function(index, canvas) {
      _this.canvasesPanel.append(_this.createCanvasLink(canvas));
    });
  }
  
  loadLayers() {
    const _this = this;
    const dfd = jQuery.Deferred();
    
    this.endpoint.getLayers(dfd);
    dfd.done(function(layers) {
      _this.currentLayerId = layers[0]['@id'];
      jQuery.each(layers, function(index, layer) {
        _this.layersPanel.append(_this.createLayerLink(layer));
      });
    });
  }
  
  loadAnnotations(annotations) {
    const _this = this;
    
    this.annosPanel.empty();
    
    jQuery.each(annotations, function(index, annotation) {
      if (annoUtil.isAnnoOnCanvas(annotation) &&
        annotation.layerId === _this.currentLayerId)
      {
        const elem = _this.createAnnoElem(annotation);
        _this.annosPanel.append(elem);
      }
    });
  }
  
  createCanvasLink(canvas) {
    const _this = this;
    const canvasId = canvas['@id'];
    const elem = jQuery('<div/>')
      .addClass('canvas')
      .html(canvasLinkTemplate({ label: canvas.label }));
      
    elem.data('canvasId', canvasId);
    
    if (canvasId === this.currentCanvasId) {
      elem.addClass('selected');
    }
    elem.click(function() {
      const oldCanvasId = _this.currentCanvasId;
      
      _this.currentCanvasId = canvasId;
      _this.refresh({
        oldCanvasId: oldCanvasId,
        newCanvasId: canvasId
      });
    });
    return elem;
  }
  
  createLayerLink(layer) {
    const _this = this;
    const layerId = layer['@id'];
    const elem = jQuery('<div/>')
      .addClass('layer')
      .html(layerLinkTemplate({ label: layer.label }));
    elem.data('layerId', layerId);
    if (layerId === this.currentLayerId) {
      elem.addClass('selected');
    }
    elem.click(function() {
      const oldLayerId = _this.currentLayerId;
      
      _this.currentLayerId = layerId;
      _this.refresh({
        oldLayerId: oldLayerId,
        newLayerId: layerId
      });
    });
    return elem;
  }
  
  createAnnoElem(annotation) {
    const _this = this;
    const content = annoUtil.getText(annotation);
    const html = annotationTemplate({ content: content });
    const elem = jQuery(html).addClass('anno');
    
    elem.data('annotation', annotation);
    
    elem.click(function() {
      const oldAnnoId = _this.selectedAnnotation ? _this.selectedAnnotation['@id'] : null;
      const newAnnoId = annotation['@id'];
      _this.selectedAnnotation = annotation;
      _this.refreshAnnosPanel(oldAnnoId, newAnnoId);
    });
    return elem;
  }

  setDimensions() {
    const winHeight = jQuery(window).height();
    const rest = 180; // estimate height of dialog minus height of content div
    const maxContentHeight =  (winHeight - rest) * 0.82;
    
    this.elem.css('margin-top', -(winHeight * 0.45));
    this.contentGrid.css('height', maxContentHeight);
    this.canvasesPanel.css('height', maxContentHeight * 0.46);
    this.layersPanel.css('height', maxContentHeight * 0.46);
  }

  scrollToCurrentCanvas() {
    const _this = this;
    const canvasElems = this.canvasesPanel.find('.canvas');
    let scrollTo = null;
    
    this.logger.debug('scrollToCurrentCanvas ' + canvasElems.length);
    
    canvasElems.each(function(index, canvasElem) {
      const elem = $(canvasElem);
      
      if (elem.data('canvasId') === _this.currentCanvasId) {
        scrollTo = elem;
        return false;
      }
    });
    
    if (scrollTo) {
      this.canvasesPanel.scrollTop(scrollTo.position().top + this.canvasesPanel.scrollTop() - 18);
    }
  }
}

let instance = null;
  
Mirador.getYmAnnotationSelector = function() {
  if (!instance) {
    const id = 'ym_annotation_selector';
    let elem = jQuery('#' + id);
    if (elem.length === 0) {
      elem = jQuery('<div/>').attr('id', id)
        .addClass('ui modal ym_modal ym_large_modal')
        .appendTo(jQuery('body'));
    }    
    instance = new YmAnnotationSelector(elem);
  }
  return instance;
};

const template = Handlebars.compile([
  '<div class="header">Find Annotation',
  '</div>',
  '<div class="content">',
  '  <div class="ui grid">',
  '    <div class="six wide column filters">',
  '      <div class="column canvases"></div>',
  '      <div class="column layers"></div>',
  '    </div>',
  '    <div class="ten wide column annos">',
  '    </div>',
  '  </div>',
  '</div>',
  '<div class="actions">',
  '  <div class="ui ok button">Select</div>',
  '  <div class="ui cancel button">Cancel</div>',
  '</div>'
].join(''));

const canvasLinkTemplate = Handlebars.compile([
  '<a href="#">{{label}}</a>'
].join(''));

const layerLinkTemplate = Handlebars.compile([
  '<a href="#">{{label}}</a>'
].join(''));

const annotationTemplate = Handlebars.compile([
  '<div>{{{content}}}</div>'
].join(''));
