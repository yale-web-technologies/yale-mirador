import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import MenuTagSelector from '../widgets/menu-tag-selector';
import LayerSelector from '../widgets/layer-selector';
import annoUtil from './anno-util';
import session from '../session';
import { getState, setState } from '../state.js';

export default class {
  
  /**
   * @returns {Promise}
   */
  constructor(options) {
    const _this = this;

    jQuery.extend(this, {
      id: null, // annotation window ID
      miradorId: null,
      appnedTo: null,
      annotationListRenderer: null,
      initialLayerId: null,
      initialTocTags: null
    }, options);

    return new Promise(function(resolve, reject) {
      _this.init().then(function() {
        resolve(_this);
      });
    });
  }

  /**
   * @returns {Promise}
   */
  init() {
    const _this = this;
    this.miradorProxy = getMiradorProxyManager().getMiradorProxy(this.miradorId);
    if (!this.id) {
      this.id = Mirador.genUUID();
    }
    this.canvasWindow = this.miradorProxy.getFirstWindow(); // window that contains the canvas for the annotations
    this.endpoint = this.canvasWindow.endpoint;
    this.element = jQuery(template({}));
    this.appendTo.append(this.element);
    this.listElem = this.element.find('.annowin_list');
    this.initLayerSelector();
    this.tempMenuRow = this.element.find('.annowin_temp_row');
    this.placeholder = this.element.find('.placeholder');
    this.placeholder.text('Loading...').show();
    
    return this.reload().then(function() {
      _this.bindEvents();
    });
  }
  
  initMenuTagSelector() {
    var _this = this;
    if (this.menuTagSelector) {
      this.menuTagSelector.destroy();
    }
    this.menuTagSelector = new MenuTagSelector({
      parent: this.element.find('.menu_tag_selector_container'),
      endpoint: this.endpoint,
      initialTags: this.initialTocTags,
      changeCallback: function(value, text) {
        console.log('Change/updateList from TOC selector');
        _this.updateList();
      }
    });
    this.initialTocTags = null;
  }
  
  initLayerSelector() {
    var _this = this;
    this.layerSelector = new LayerSelector({
      parent: this.element.find('.layer_selector_container'),
      endpoint: this.endpoint,
      initialLayerId: this.initialLayerId,
      changeCallback: function(value, text) {
        console.log('Change/updateList from Layer selector');
        _this.currentLayerId = value;
        _this.updateList();
      }
    });
    this.initialLayerId = null;
  }

  reload() {
    console.log('AnnotationWindow#reload');
    const _this = this;

    this.placeholder.hide();

    if (getState('ANNO_CELL_FIXED') === 'true') {
      this.element.addClass('fixed_height_cells');
    } else {
      this.element.removeClass('fixed_height_cells');
    }

    var canvas = this.getCurrentCanvas();
    this.element.find('.title').text(canvas.label);
    
    if (this.endpoint.getCanvasToc()) {
      this.initMenuTagSelector();
      this.element.find('.annowin_menu_tag_row').show();
    } else {
      this.element.find('.annowin_menu_tag_row').hide();
    }
    
    const layersPromise = new Promise(function(resolve, reject) {
      if (_this.endpoint.getAnnotationLayers().length > 0) {
        if (_this.layerSelector.isLoaded()) {
          resolve();
        } else {
          _this.layerSelector.init().then(function() {
            resolve();
          });
        }
      } else {
        reject();
      }
    });
    
    const tocPromise = new Promise(function(resolve, reject) {
      if (_this.endpoint.getCanvasToc()) {
        _this.menuTagSelector.reload().then(function() {
          resolve();
        });
      } else {
        reject();
      }
    });
    
    return Promise.all([layersPromise, tocPromise]).then(function() {
      _this.updateList();
      return _this;
    });
    
    /*
    return new Promise(function(resolve, reject) {
      jQuery.when(layerDfd, menuTagDfd).done(function() {
        _this.updateList();
        resolve();
      });
    });*/
  }
  
  updateList() {
    console.log('AnnotationWindow#updateList');
    const _this = this;
    const options = {};

    options.parentElem = this.listElem;
    options.annotationWindow = this;
    options.isEditor = session.isEditor();
    options.annotationsList = this.canvasWindow.annotationsList;
    options.toc = this.endpoint.getCanvasToc();
    options.selectedTags = ['all'];
    if (this.endpoint.getCanvasToc()) {
      options.selectedTags = this.menuTagSelector.val().split('|');
    }
    options.isCompleteList = (options.selectedTags[0] === 'all'); // true if current window will show all annotations of a sortable list.
    options.layerId  = this.layerSelector.val();
    
    const count = this.annotationListRenderer.render(options);
    
    if (count === 0) {
      this.placeholder.text('No annotations found.').show();
    } else {
      this.placeholder.hide();
    }
  }
  
  getCurrentCanvas() {
    var window = this.canvasWindow;
    var id = window.canvasID;
    var canvases = window.manifest.getCanvases();
    return canvases.filter(function (canvas) {
      return canvas['@id'] === id;
    })[0];
  }
  
  highlightAnnotation(annoId) {
    this.listElem.find('.annowin_anno').each(function(index, value) {
      var annoElem = jQuery(value);
      var curAnnoId = annoElem.data('annotationId');
      if (curAnnoId === annoId) {
        annoElem.addClass('ym_anno_selected');
      } else {
        annoElem.removeClass('ym_anno_selected');
      }
    });
  }

  highlightAnnotations(annotations, flag) {
    const _this = this;
    const klass = (flag == 'TARGETING' ? 'ym_anno_targeting' : 'ym_anno_targeted');
    let firstMatch = true;
    
    this.listElem.find('.annowin_anno').each(function(index, value) {
      const annoElem = jQuery(value);
      const annoId = annoElem.data('annotationId');
      let matched = false;

      jQuery.each(annotations, function(index, value) {
        const targetAnnotationId = value['@id'];
        if (annoId === targetAnnotationId) {
          matched = true;
          annoElem.addClass(klass);
          if (firstMatch) {
            _this.scrollToElem(annoElem);
            firstMatch = false;
          }
        }
      });
      if (!matched) {
        annoElem.removeClass(klass);
      }
    });
  }
  
  scrollToElem(annoElem) {
    console.log('annoElem.position().top: ' + annoElem.position().top);
    console.log('element.scrollTop(): ' + this.element.scrollTop());
    
    //this.listElem.animate({
    this.element.animate({
      //scrollTop: annoElem.position().top + this.listElem.scrollTop()
      scrollTop: annoElem.position().top + this.listElem.position().top + this.element.scrollTop()
    }, 250);
  }
  
  scrollToAnnotation(annoId) {
    console.log('AnnotationWindow#scrollToAnnotation annoId: ' + annoId);
    const _this = this;
    let found = false;
    
    this.listElem.find('.annowin_anno').each(function(index, value) {
      const elem = $(value);
      if (elem.data('annotationId') === annoId) {
        found = true;
        _this.scrollToElem(elem);
        return false;
      }
    });
    return found;
  }
  
  clearHighlights() {
    this.listElem.find('.annowin_anno').each(function(index, value) {
      jQuery(value).removeClass('annowin_targeted')
        .removeClass('ym_anno_selected ym_anno_targeting ym_anno_targeted');
    });
  }
  
  createInfoDiv(annotation, callback) {
    var targetAnnoID = annotation.on.full;
    var targetLink = '<a target="_blank" href="' + targetAnnoID + '">' + targetAnnoID + '</a>';
    return jQuery(infoTemplate({ on: targetLink }));
  }
  
  hasOpenEditor() {
    var hasOne = false;
    this.listElem.find('.annowin_anno').each(function(index, value) {
      if (jQuery(value).data('editing') === true) {
        hasOne = true;
        return false; // breaking out of jQuery.each
      };
    });
    return hasOne;
  }
  
  saveOrder() {
    var _this = this;
    var annoElems = this.listElem.find('.annowin_anno');
    var annoIds = [];
    jQuery.each(annoElems, function(index, value) {
      var annoId = jQuery(value).data('annotationId');
      annoIds.push(annoId);
    });
    var canvas = this.getCurrentCanvas();
    this.endpoint.updateOrder(canvas['@id'], this.currentLayerId, annoIds,
      function() { // success
        _this.tempMenuRow.hide();
      },
      function() { // error
        _this.tempMenuRow.hide();
      });
  }
  
  fadeUp(elem, onComplete) {
    elem.transition({ 
      animation: 'fade up', 
      duration: '0.3s',
      onComplete: onComplete
    });
  }
  
  fadeDown(elem, onComplete) {
    elem.transition({ 
      animation: 'fade down', 
      duration: '0.3s',
      onComplete: onComplete
    });
  }
  
  bindEvents() {
    var _this = this;
    
    this.element.find('.annowin_temp_row .ym_button').click(function(event) {
      _this.saveOrder();
    });
    
    jQuery.subscribe('YM_READY_TO_RELOAD_ANNO_WIN', function(event) {
      if (! _this.hasOpenEditor()) {
        _this.reload();
      }
    });
    
    jQuery.subscribe('ANNOTATION_FOCUSED', function(event, annoWinId, annotation) {
      console.log('Annotation window ' + _this.id + ' received annotation_focused event from ' + annoWinId);
      if (annoWinId === _this.id) {
        return;
      }
      _this.clearHighlights();
      
      const annotationsList = _this.canvasWindow.annotationsList;
      const layerId = _this.currentLayerId;
      const toc = _this.endpoint.getCanvasToc();
      
      if (toc) {
        const siblings = annoUtil.findTocSiblings(annotation, annotationsList, layerId, toc);
        if (siblings.length > 0) {
          _this.highlightAnnotations(siblings, 'SIBLING');
          return;
        }
      }
      const targeting = annoUtil.findTargetingAnnotations(annotation, annotationsList, layerId);
      if (targeting.length > 0) {
        _this.highlightAnnotations(targeting, 'TARGETING');
        return;
      }
      const targeted = annoUtil.findTargetAnnotations(annotation, annotationsList, layerId);
      if (targeted.length > 0) {
        _this.highlightAnnotations(targeted, 'TARGET');
        return;
      }
    });
    
    jQuery.subscribe('YM_ANNO_HEIGHT_FIXED', function(event, fixedHeight) {
      if (fixedHeight) {
        _this.element.addClass('fixed_height_cells');
      } else {
        _this.element.removeClass('fixed_height_cells');
      }
    });
    
    this.miradorProxy.subscribe(('currentCanvasIDUpdated.' + this.canvasWindow.id), function(event) {
      _this.placeholder.text('Loading...').show();
    });
  }
}
  
const template = Handlebars.compile([
  '<div class="ym_annotation_window">',
  '  <div class="annowin_header">',
  '    <div class="annowin_layer_row">', 
  '      <span class="layer_selector_container"></span>',
  '    </div>',
  '    <div class="annowin_menu_tag_row">',
  '      <span class="menu_tag_selector_container"></span>',
  '    </div>',
  '    <div class="annowin_temp_row">',
  '      <div class="fluid ui small orange button ym_button">Click to save order</div>',
  '    </div>',
  '  </div>',
  '  <div class="placeholder"></div>',
  '  <div class="annowin_list">',
  '  </div>',
  '</div>'
].join(''));

