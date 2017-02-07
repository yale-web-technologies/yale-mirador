import {annoUtil} from '../import';
import AnnotationEditor from './annotation-editor';
import getLogger from '../util/logger';
import getStateStore from '../state-store';

/**
 * Generate HTML elements for the annotations to be shown in the annotation window,
 * depending on the context.
 */
export default class AnnotationListRenderer {
  constructor() {
    this.logger = getLogger();
  }

  /*
   * Creates a div that contains annotation elements.
   * @param {object} options
   */
  render(options) {
    this.logger.debug('AnnotationListRenderer#render options:', options);
    options.parentElem.empty();
    if (options.toc) {
      return this.renderWithToc(options);
    } else {
      return this.renderDefault(options);
    }
  }
  
  renderDefault(options) {
    this.logger.debug('AnnotationListRenderer#renderDefault options:', options);
    const _this = this;
    let count = 0;
    
    jQuery.each(options.annotationsList, function(index, annotation) {
      try {
        if (options.layerId === annotation.layerId) {
          if (options.selectedTags[0] === 'all' || options.toc.matchHierarchy(annotation, options.selectedTags)) {
            ++count;
            const annoElem = _this.createAnnoElem(annotation, options);
            options.parentElem.append(annoElem);
          }
        }
      } catch (e) {
        _this.logger.error('ERROR AnnotationListRenderer#render', e);
        throw e;
      }
    });
    return count;
  }
  
  /**
   * Consult the table of contents structure to populate the annotations list.
   */
  renderWithToc(options) {
    this.logger.debug('AnnotationListRenderer#renderWithToc options:', options);
    const _this = this;
    
    options.toc.walk(function(node) {
      if (node.isRoot) {
        return; // do nothing with root node
      }
      _this.appendHeader(node, options);
      _this.appendAnnotationForTocNode(node, options);
      _this.appendAnnotationsForChildNodes(node, options);
    });
    _this.appendUnattachedAnnotations(options);
  }
  
  appendHeader(node, options) {
    const layerId = options.layerId;
    const selectedTags = options.selectedTags;
    const numChildNodes = Object.keys(node.childNodes).length;
    const showAll = (selectedTags[0] === 'all');

    function arrayContains(a, b) {
      if (a.length < b.length) { return false; }
      for (let i = 0; i < b.length; ++i) {
        if (a[i] !== b[i]) { return false; }
      }
      return true;
    }
    
    // We are distinguishing between leaf and non-leaf nodes to ensure
    // only one header will show over any set of annotations.
    
    // True if node is a non-leaf and there are annotations to show under the header
    function nonLeafHasAnnotationsToShow() {
      function hasChildAnnotationsToShow() {
        const annos = node.childAnnotations;
        const num = annos.length;
        for (let i = 0; i < num; ++i) {
          let anno = node.childAnnotations[i];
          if (anno.layerId === layerId) {
            return true;
          }
        }
        return false;
      }
      return numChildNodes > 0 && // non-leaf
       (node.annotation && node.annotation.layerId === layerId || // the annotation for this node matches the current layer so it will show
        hasChildAnnotationsToShow()); // there are annotations that target this non-leaf node directly
    }

    // True if node is a leaf and there are annotations to show under the header
    function leafHasAnnotationsToShow() {
      return numChildNodes === 0 && node.layerIds.has(layerId); // node is a leaf and there are annotations with matching layer
    }
    
    if ((showAll || arrayContains(node.cumulativeTags, selectedTags)) &&
      (nonLeafHasAnnotationsToShow() || leafHasAnnotationsToShow()))
    {
      const headerElem = this.createHeaderElem(node);
      options.parentElem.append(headerElem);
    }
  }
  
  appendAnnotationForTocNode(node, options) {
    const layerId = options.layerId;
    const selectedTags = options.selectedTags;
    const showAll = (selectedTags[0] === 'all'); // show all chapters/scenes if true
    
    if (node.annotation && layerId === node.annotation.layerId &&
      (showAll || options.toc.matchHierarchy(node.annotation, selectedTags)))
    {
      options.parentElem.append(this.createAnnoElem(node.annotation, options));
    }
  }
  
  appendAnnotationsForChildNodes(node, options) {
    const _this = this;
    const layerId = options.layerId;
    const selectedTags = options.selectedTags;
    const showAll = (selectedTags[0] === 'all');
    
    jQuery.each(node.childAnnotations, function(index, annotation) {
      if (layerId === annotation.layerId &&
        (showAll || options.toc.matchHierarchy(annotation, selectedTags)))
      {
        options.parentElem.append(_this.createAnnoElem(annotation, options));
      }
    });
  }

  appendUnattachedAnnotations(options) {
    const _this = this;
    const layerId = options.layerId;
    const showAll = (options.selectedTags[0] === 'all');

    if (showAll && options.toc.numUnassigned() > 0) {
      const unassignedHeader = jQuery(headerTemplate({ text: 'Unassigned' }));
      let count = 0;
      options.parentElem.append(unassignedHeader);
      jQuery.each(options.toc.unassigned(), function(index, annotation) {
        if (layerId === annotation.layerId) {
          options.parentElem.append(_this.createAnnoElem(annotation, options));
          ++count;
        }
      });
      if (count === 0) {
        unassignedHeader.hide();
      }
    }
  }
  
  createHeaderElem(node) {
    const text = node.cumulativeLabel;
    const headerHtml = headerTemplate({ text: text });
    return jQuery(headerHtml);
  }

  createAnnoElem(annotation, options) {
    this.logger.debug('AnnotationWindow#createAnnoElem anno:', annotation);
    const content = annoUtil.getText(annotation);
    const tags = annoUtil.getTags(annotation);
    const tagsHtml = this.getTagsHtml(tags);
    const state = getStateStore();

    const annoHtml = annotationTemplate({
      content: content,
      tags: tagsHtml,
      isEditor: options.isEditor,
      orderable: options.isCompleteList
    });
    const layerIndex = state.getObject('layerIndexMap')[annotation.layerId];
    const annoElem = jQuery(annoHtml);
    const menuBar = annoElem.find('.menu_bar');

    annoElem.data('annotationId', annotation['@id']);
    annoElem.find('.ui.dropdown').dropdown({ direction: 'downward' });

    menuBar.addClass('layer_' + layerIndex % 10);
    if (annotation.on['@type'] == 'oa:Annotation') { // annotation of annotation
      menuBar.addClass('targeting_anno');
    } else {
      menuBar.removeClass('targeting_anno');
    }

    this.bindAnnotationItemEvents(annoElem, annotation, options);
    return annoElem;
  }

  getTagsHtml(tags) {
    let html = '';
    jQuery.each(tags, function(index, value) {
      html += '<span class="tag">' + value + '</span>';
    });
    return html;
  }

  bindAnnotationItemEvents(annoElem, annotation, options) {
    const _this = this;
    const annoWin = options.annotationWindow;
    const finalTargetAnno = annoUtil.findFinalTargetAnnotation(annotation, 
      options.annotationsList);

    annoElem.click(function(event) {
      _this.logger.debug('Clicked annotation:', annotation);
      annoWin.clearHighlights();
      annoWin.highlightAnnotation(annotation['@id']);
      annoWin.miradorProxy.publish('ANNOTATION_FOCUSED', [annoWin.id, finalTargetAnno]);
      jQuery.publish('ANNOTATION_FOCUSED', [annoWin.id, annotation]);
    });

    annoElem.find('.annotate').click(function (event) {
      const dialogElement = jQuery('#ym_annotation_dialog');
      const editor = new AnnotationEditor({
        parent: dialogElement,
        canvasWindow: annoWin.canvasWindow,
        mode: 'create',
        targetAnnotation: annotation,
        endpoint: annoWin.endpoint,
        saveCallback: function(annotation) {
          dialogElement.dialog('close');
          annoWin.canvasWindow.annotationsList.push(annotation);
          annoWin.miradorProxy.publish('ANNOTATIONS_LIST_UPDATED', 
            { windowId: annoWin.canvasWindow.id, annotationsList: annoWin.canvasWindow.annotationsList });
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
      const editor = new AnnotationEditor({
        parent: annoElem,
        canvasWindow: annoWin.canvasWindow,
        mode: 'update',
        endpoint: annoWin.endpoint,
        annotation: annotation,
        saveCallback: function(annotation, content) {
          if (annoWin.currentLayerId === annotation.layerId) {
            const normalView = annoElem.find('.normal_view');
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
        annoWin.miradorProxy.publish('annotationDeleted.' + annoWin.canvasWindow.id, [annotation['@id']]);
      }
    });
    
    annoElem.find('.up.icon').click(function(event) {
      const sibling = annoElem.prev();
      if (sibling.length > 0 && sibling.hasClass('annowin_anno')) {
        annoWin.fadeDown(annoElem, function() {
          annoElem.after(sibling);
          annoWin.fadeUp(annoElem, function() {
            annoWin.tempMenuRow.show();
          });
        });
      }
    });

    annoElem.find('.down.icon').click(function(event) {
      const sibling = annoElem.next();
      if (sibling.length > 0 && sibling.hasClass('annowin_anno')) {
        annoWin.fadeUp(annoElem, function() {
          annoElem.before(sibling);
          annoWin.fadeDown(annoElem, function() {
            annoWin.tempMenuRow.show();
          });
        });
      }
    });
  }
}

const annotationTemplate = Handlebars.compile([
  '<div class="annowin_anno">',
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

const headerTemplate = Handlebars.compile([
  '<div class="annowin_group_header">{{text}}',
  '</div>'
].join(''));

