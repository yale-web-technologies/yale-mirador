import getMiradorProxy from '../mirador-proxy';
import MenuTagSelector from '../widgets/menu-tag-selector';
import LayerSelector from '../widgets/layer-selector';
import annoUtil from './anno-util';
import session from '../session';
import { getState, setState } from '../state.js';

let template = Handlebars.compile([
  '<div class="mr_annotation_window">',
  '  <div class="annowin_header">',
  '    <div class="annowin_menu_tag_row">',
  '      <span class="menu_tag_selector_container"></span>',
  '    </div>',
  '    <div class="annowin_layer_row">', 
  '      <span class="layer_selector_container"></span>',
  '    </div>',
  '    <div class="annowin_temp_row">',
  '      <div class="fluid ui small orange button mr_button">Click to save order</div>',
  '    </div>',
  '  </div>',
  '  <div class="placeholder"></div>',
  '  <div class="annowin_list">',
  '  </div>',
  '</div>'
].join(''));

let annotationTemplate = Handlebars.compile([
  '<div class="annowin_anno" draggable="true">',
  '  <div class="info_view"></div>',
  '  <div class="normal_view">',
  '    {{#if isEditor}}',
  '      <div class="menu_bar">',
  '        <div class="ui text menu">',
  '          <div class="ui dropdown item">',
  '            Action<i class="dropdown icon"></i>',
  '            <div class="menu">',
  '              <div class="annotate item"><i class="fa fa-hand-o-left fa-fw"></i> Annotate</div>',
  '              <div class="edit item"><i class="fa fa-edit fa-fw"></i> {{t "edit"}}</div>',
  '              <div class="delete item"><i class="fa fa-times fa-fw"></i> {{t "delete"}}</div>',
  '            </div>',
  '          </div>',
  '          {{#if orderable}}',
  '            <div class="right menu">',
  '              <i class="caret down icon"></i>',
  '              <i class="caret up icon"></i>',
  '            </div>',
  '          {{/if}}',
  '        </div>',
  '      </div>',
  '    {{/if}}',
  '    <div class="content">{{{content}}}</div>',
  '    <div class="tags">{{{tags}}}</div>',
  '  </div>',
  '</div>'
].join(''));

let headerTemplate = Handlebars.compile([
  '<div class="annowin_group_header">{{text}}',
  '</div>'
].join(''));

let infoTemplate = Handlebars.compile([
  '<div class="info_view">',
  '  <span class="anno_info_label">On:<span>',
  '  <span class="anno_info_value">{{{on}}}</span>',
  '</div>'
].join(''));


export default class {
  constructor(options) {
    jQuery.extend(this, {
      id: null,
      appnedTo: null,
      element: null,
      canvasWindow: null, // window that contains the canvas for the annotations
      endpoint: null
    }, options);

    this.init();
  }

  init() {
    this.miradorProxy = getMiradorProxy();
    if (!this.id) {
      this.id = Mirador.genUUID();
    }
    this.canvasWindow = this.miradorProxy.getFirstWindow();
    this.endpoint = this.canvasWindow.endpoint;
    this.element = jQuery(template({}));
    this.appendTo.append(this.element);
    this.listElem = this.element.find('.annowin_list');
    this.initLayerSelector();
    this.tempMenuRow = this.element.find('.annowin_temp_row');
    this.placeholder = this.element.find('.placeholder');
    this.placeholder.text('Loading...').show();
    
    this.reload();
    this.bindEvents();
  }
  
  initMenuTagSelector() {
    var _this = this;
    if (this.menuTagSelector) {
      this.menuTagSelector.destroy();
    }
    this.menuTagSelector = new MenuTagSelector({
      parent: this.element.find('.menu_tag_selector_container'),
      endpoint: this.endpoint,
      changeCallback: function(value, text) {
        _this.updateList();
      }
    });
  }
  
  initLayerSelector() {
    var _this = this;
    this.layerSelector = new LayerSelector({
      parent: this.element.find('.layer_selector_container'),
      endpoint: this.endpoint,
      changeCallback: function(value, text) {
        var layerId = value;
        _this.updateList();
      }
    });
  }

  reload() {
    var _this = this;
    var layerDfd = null, menuTagDfd = null;

    this.placeholder.hide();

    if (getState('ANNO_CELL_FIXED') === 'true') {
      this.element.addClass('fixed_height_cells');
    } else {
      this.element.removeClass('fixed_height_cells');
    }

    var canvas = this.getCurrentCanvas();
    this.element.find('.title').text(canvas.label);
    
    if (this.endpoint.parsed) {
      //this.listElem.css('top', 60);
      this.initMenuTagSelector();
      this.element.find('.annowin_menu_tag_row').show();
    } else {
      //this.listElem.css('top', 35);
      this.element.find('.annowin_menu_tag_row').hide();
    }

    if (this.endpoint.annotationLayers.length > 0) {
      if (this.layerSelector.isLoaded()) {
        layerDfd = jQuery.Deferred().resolve();
      } else {
        layerDfd = this.layerSelector.init();
      }
    } else {
      layerDfd = jQuery.Deferred().reject();
    }
    
    if (this.endpoint.parsed) {
      menuTagDfd = this.menuTagSelector.reload();
    } else {
      menuTagDfd = jQuery.Deferred().resolve();
    }
    
    jQuery.when(layerDfd, menuTagDfd).done(function() {
      _this.updateList();
    });
  }
  
  updateList() {
    console.log('AnnotationWindow#updateList');
    var _this = this;
    var annotationsList = this.canvasWindow.annotationsList;
    
    var menuTags = ['all'];
    if (this.endpoint.parsed) {
      menuTags = this.menuTagSelector.val().split('|');
      annotationsList = this.endpoint.parsed.sortedAnnosWithHeaders(annotationsList);
    }
    var isCompleteList = (menuTags[0] === 'all'); // true if current window will show all annotations of a sortable list.
    var layerId  = this.layerSelector.val();
    var parsed = this.endpoint.parsed;

    this.currentLayerId = layerId;
    this.listElem.empty();
    
    var count = 0;
    
    jQuery.each(annotationsList, function(index, value) {
      try {
        if (layerId === value.layerId) {
          if (menuTags[0] === 'all' || parsed.matchHierarchy(value, menuTags)) {
            ++count;
            _this.addAnnotation(value, isCompleteList);
          }
        }
      } catch (e) {
        console.log('ERROR AnnotationWindow#updateList ' + e);
      }
    });
    
    if (count === 0) {
      this.placeholder.text('No annotations found.').show();
    } else {
      this.placeholder.hide();
    }
  }
  
  addAnnotation(annotation, isCompleteList) {
    //console.log('AnnotationWindow#addAnnotation:');
    //console.dir(annotation);
    var content = annoUtil.getAnnotationText(annotation);
    var tags = annoUtil.getTags(annotation);
    var tagsHtml = this.getTagsHtml(tags);
    
    var annoHtml = annotationTemplate({
      content: content,
      tags: tagsHtml,
      isEditor: session.isEditor(),
      orderable: isCompleteList
    });
    var annoElem = jQuery(annoHtml);
    var infoDiv = annoElem.find('.info_view');
    
    annoElem.data('annotationId', annotation['@id']);
    annoElem.find('.ui.dropdown').dropdown();
    if (annotation.on['@type'] == 'oa:Annotation') { // annotation of annotation
      annoElem.find('.menu_bar').addClass('targeting_anno');
    } else {
      annoElem.find('.menu_bar').removeClass('targeting_anno');
    }
    this.setAnnotationItemInfo(annoElem, annotation);
    this.bindAnnotationItemEvents(annoElem, annotation);
    infoDiv.hide();
    this.listElem.append(annoElem);
  }
  
  setAnnotationItemInfo(annoElem, annotation) {
    var infoElem = annoElem.find('.annowin_info');
    if (annotation.on['@type'] == 'oa:Annotation') { // target: annotation
      infoElem.addClass('anno_on_anno');
    } else {
      infoElem.removeClass('anno_on_anno');
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
  
  highlightFocusedAnnotation(annotation) {
    this.listElem.find('.annowin_anno').each(function(index, value) {
      var annoElem = jQuery(value);
      var annoID = annoElem.data('annotationId');
      if (annoID === annotation['@id']) {
        annoElem.addClass('mr_anno_selected');
      } else {
        annoElem.removeClass('mr_anno_selected');
      }
    });
  }

  highlightAnnotations(annotations, flag) {
    var _this = this;
    var klass = (flag == 'TARGETING' ? 'mr_anno_targeting' : 'mr_anno_targeted');
    
    this.listElem.find('.annowin_anno').each(function(index, value) {
      var annoElem = jQuery(value);
      var annoId = annoElem.data('annotationId');
      var matched = false;
      var firstMatch = true;

      jQuery.each(annotations, function(index, value) {
        var targetAnnotationId = value['@id'];
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
    this.listElem.animate({
      scrollTop: annoElem.position().top + this.listElem.scrollTop()
    }, 250);
  }
  
  clearHighlights() {
    this.listElem.find('.annowin_anno').each(function(index, value) {
      jQuery(value).removeClass('annowin_targeted')
        .removeClass('mr_anno_selected mr_anno_targeting mr_anno_targeted');
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
  
  getTagsHtml(tags) {
    var html = '';
    jQuery.each(tags, function(index, value) {
      html += '<span class="tag">' + value + '</span>';
    });
    return html;
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
    
    this.element.find('.annowin_temp_row .mr_button').click(function(event) {
      _this.saveOrder();
    });
    
    jQuery.subscribe('MR_READY_TO_RELOAD_ANNO_WIN', function(event) {
      if (! _this.hasOpenEditor()) {
        _this.reload();
      }
    });
    
    jQuery.subscribe('ANNOTATION_FOCUSED', function(event, annoWinId, annotation) {
      console.log('Annotation window ' + _this.id + ' received annotation_focused event');
      if (annoWinId !== _this.id) {
        _this.clearHighlights();
        var annotationsList = _this.canvasWindow.annotationsList;
        var targeting = annoUtil.findTargetingAnnotations(annotationsList,
          _this.currentLayerId, annotation);
        var targeted = annoUtil.findTargetAnnotations(annotationsList,
          _this.currentLayerId, annotation);
        _this.highlightAnnotations(targeting, 'TARGETING');
        _this.highlightAnnotations(targeted, 'TARGET');
      }
    });
    
    jQuery.subscribe('MR_ANNO_HEIGHT_FIXED', function(event, fixedHeight) {
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
  
  bindAnnotationItemEvents(annoElem, annotation) {
    var _this = this;
    var infoElem = annoElem.find('.annowin_info');
    var finalTargetAnno = annoUtil.findFinalTargetAnnotation(annotation, 
      this.canvasWindow.annotationsList);
    
    annoElem.click(function(event) {
      _this.clearHighlights();
      _this.highlightFocusedAnnotation(annotation);
      _this.miradorProxy.publish('ANNOTATION_FOCUSED', [_this.id, finalTargetAnno]);
      jQuery.publish('ANNOTATION_FOCUSED', [_this.id, annotation]);
    });
    
    annoElem.find('.annotate').click(function (event) {
      var dialogElement = jQuery('#mr_annotation_dialog');
      var editor = new Mirador.AnnotationEditor({
        parent: dialogElement,
        canvasWindow: _this.canvasWindow,
        mode: 'create',
        targetAnnotation: annotation,
        endpoint: _this.endpoint,
        saveCallback: function(annotation) {
          dialogElement.dialog('close');
          _this.canvasWindow.annotationsList.push(annotation);
          _this.miradorProxy.publish('ANNOTATIONS_LIST_UPDATED', 
            { windowId: _this.canvasWindow.id, annotationsList: _this.canvasWindow.annotationsList });
        },
        cancelCallback: function() {
          dialogElement.dialog('close');
        }
      });
      dialogElement.dialog({
        title: 'Create annotation',
        modal: true,
        draggable: true,
        dialogClass: 'no_close',
        width: 400
      });
      editor.show();
    });
    
    annoElem.find('.edit').click(function(event) {
      var editor = new Mirador.AnnotationEditor({
        parent: annoElem,
        canvasWindow: _this.canvasWindow,
        mode: 'update',
        endpoint: _this.endpoint,
        annotation: annotation,
        saveCallback: function(annotation, content) {
          if (_this.currentLayerId === annotation.layerId) {
            var normalView = annoElem.find('.normal_view');
            normalView.find('.content').html(content);
            normalView.show();
            annoElem.data('editing', false);
          } else {
            annoElem.remove();
          }
        },
        cancelCallback: function() {
          annoElem.find('.normal_view').show();
          annoElem.data('editing', false);
        }
      });
      
      annoElem.data('editing', true);
      annoElem.find('.normal_view').hide();
      editor.show();
    });
    
    annoElem.find('.delete').click(function(event) {
      if (window.confirm('Do you really want to delete the annotation?')) {
        _this.miradorProxy.publish('annotationDeleted.' + _this.canvasWindow.id, [annotation['@id']]);
      }
    });
    
    annoElem.find('.up.icon').click(function(event) {
      var sibling = annoElem.prev();
      if (sibling.size() > 0) {
        _this.fadeDown(annoElem, function() {
          annoElem.after(sibling);
          _this.fadeUp(annoElem, function() {
            _this.tempMenuRow.show();
          });
        });
      }
    });
    
    annoElem.find('.down.icon').click(function(event) {
      var sibling = annoElem.next();
      if (sibling.size() > 0) {
        _this.fadeUp(annoElem, function() {
          annoElem.before(sibling);
          _this.fadeDown(annoElem, function() {
            _this.tempMenuRow.show();
          });
        });
      }
    });
    
    infoElem.click(function(event) {
      var infoDiv = annoElem.find('.info_view');
      if (infoDiv.css('display') === 'none') {
        infoDiv.replaceWith(_this.createInfoDiv(annotation));
        infoDiv.show();
      } else {
        infoDiv.hide();
      }
    });
  }
};
