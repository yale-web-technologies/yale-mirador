import annoUtil from '../annotation/anno-util';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';

class YmAnnotationSelector {
  
  constructor(elem) {
    this.elem = elem;
    elem.modal();
  }
  
  open(windowId) {
    const miradorProxyManager = getMiradorProxyManager();
    const window = miradorProxyManager.getWindowById(windowId);
    const manifest = mirador.getManifestForWindowId(windowId);
    
    this.elem.html(template());
    this.contentGrid = this.elem.find('.grid');
    this.canvasesElem = this.elem.find('.canvases');
    this.annosElem = this.elem.find('.annos');
    
    this.loadCanvases(manifest);
    this.loadAnnotations(window.annotationsList);
    this.elem.modal('show');
    this.setDimensions();
    this.scrollToCurrentCanvas(window);
  }
  
  setDimensions() {
    const maxHeight = jQuery(window).height() - 210;
    console.log('winHeight: ' + jQuery(window).height());
    console.log('top: ' + this.contentGrid.offset().top);
    console.log('maxHeight: ' + maxHeight);
    this.contentGrid.css('max-height', maxHeight);
  }
  
  loadCanvases(manifest) {
    const _this = this;
    const canvases = manifest.getCanvases();
    
    jQuery.each(canvases, function(index, canvas) {
      _this.canvasesElem.append(_this.createCanvasLink(canvas));
    });
  }
  
  loadAnnotations(annotations) {
    const _this = this;
    jQuery.each(annotations, function(index, annotation) {
      if (annoUtil.isAnnoOnCanvas(annotation)) {
        const content = annoUtil.getAnnotationText(annotation);
        const html = annotationTemplate({ content: content });
        const elem = jQuery(html).addClass('anno');
        _this.annosElem.append(elem);
      }
    });
  }
  
  createCanvasLink(canvas) {
    const elem = jQuery('<div/>')
      .html(canvasLinkTemplate({ label: canvas.label }));
    elem.data('canvasId', canvas['@id']);
    elem.click(function() {
      console.log(elem.data('canvasId'));
    });
    return elem;
  }
  
  // XXX
  scrollToCurrentCanvas(window) {
    const currentCanvasId = getMiradorProxyManager().getCurrentCanvasId(window);
    const annotations = window.annotationsList;
    //jQuery.each(anno)
  }
}

let instance = null;
  
Mirador.getYmAnnotationSelector = function() {
  if (!instance) {
    const id = 'ym_annotation_selector';
    let elem = jQuery('#' + id);
    if (elem.size() === 0) {
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
  '    <div class="six wide column canvases">',
  '    </div>',
  '    <div class="ten wide column annos">',
  '    </div>',
  '  </div>',
  '</div>'
].join(''));

const canvasLinkTemplate = Handlebars.compile([
  '<a href="#">{{label}}</a>'
].join(''));

const annotationTemplate = Handlebars.compile([
  '<div>{{{content}}}</div>'
].join(''));
