import annoUtil from './anno-util';

/**
 * Generate HTML elements for the annotations to be shown in the annotation window,
 * depending on the context.
 */
export default class AnnotationListRenderer {
  constructor() {
  }

  /*
   * Creates a div that contains annotation elements.
   * @param {object} options
   */
  render(options) {
    console.log('AnnotationListRenderer#render');
    options.parentElem.empty();
    if (options.toc) {
      return this.renderWithToc(options);
    } else {
      return this.renderDefault(options);
    }
  }
  
  renderDefault(options) {
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
        console.log('ERROR AnnotationListRenderer#render ' + e);
        throw e;
      }
    });
    return count;
  }
  
  /**
   * Consult the table of contents structure to populate the annotations list.
   */
  renderWithToc(options) {
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
    const showAll = (options.selectedTags[0] === 'all'); // show all chapters/scenes if true
    const numChildNodes = Object.keys(node.childNodes).length;

    if ((node.layerIds.has(layerId) && numChildNodes === 0) ||
      (numChildNodes > 0 && node.annotation.layerId === layerId))
    {
      const headerElem = this.createHeaderElem(node);
      options.parentElem.append(headerElem);
    }
  }
  
  appendAnnotationForTocNode(node, options) {
    const layerId = options.layerId;
    const selectedTags = options.selectedTags;
    const showAll = (selectedTags[0] === 'all');
    
    if (layerId === node.annotation.layerId &&
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
    
    if (options.toc.numUnassigned() > 0) {
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
    //console.log('AnnotationWindow#addAnnotation:');
    //console.dir(annotation);
    const content = annoUtil.getAnnotationText(annotation);
    const tags = annoUtil.getTags(annotation);
    const tagsHtml = this.getTagsHtml(tags);
    
    const annoHtml = annotationTemplate({
      content: content,
      tags: tagsHtml,
      isEditor: options.isEditor,
      orderable: options.isCompleteList
    });
    const annoElem = jQuery(annoHtml);
    const infoDiv = annoElem.find('.info_view');
    
    annoElem.data('annotationId', annotation['@id']);
    annoElem.find('.ui.dropdown').dropdown();
    if (annotation.on['@type'] == 'oa:Annotation') { // annotation of annotation
      annoElem.find('.menu_bar').addClass('targeting_anno');
    } else {
      annoElem.find('.menu_bar').removeClass('targeting_anno');
    }
    this.setAnnotationItemInfo(annoElem, annotation);
    infoDiv.hide();
    
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
  
  setAnnotationItemInfo(annoElem, annotation) {
    const infoElem = annoElem.find('.annowin_info');
    if (annotation.on['@type'] == 'oa:Annotation') { // target: annotation
      infoElem.addClass('anno_on_anno');
    } else {
      infoElem.removeClass('anno_on_anno');
    }
  }

  bindAnnotationItemEvents(annoElem, annotation, options) {
    const annoWin = options.annotationWindow;
    const infoElem = annoElem.find('.annowin_info');
    const finalTargetAnno = annoUtil.findFinalTargetAnnotation(annotation, 
      options.annotationsList);
    
    annoElem.click(function(event) {
      annoWin.clearHighlights();
      annoWin.highlightFocusedAnnotation(annotation);
      annoWin.miradorProxy.publish('ANNOTATION_FOCUSED', [annoWin.id, finalTargetAnno]);
      jQuery.publish('ANNOTATION_FOCUSED', [annoWin.id, annotation]);
    });
    
    annoElem.find('.annotate').click(function (event) {
      const dialogElement = jQuery('#mr_annotation_dialog');
      const editor = new Mirador.AnnotationEditor({
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
      const editor = new Mirador.AnnotationEditor({
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
      if (sibling.size() > 0) {
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
      if (sibling.size() > 0) {
        annoWin.fadeUp(annoElem, function() {
          annoElem.before(sibling);
          annoWin.fadeDown(annoElem, function() {
            annoWin.tempMenuRow.show();
          });
        });
      }
    });
  
    infoElem.click(function(event) {
      const infoDiv = annoElem.find('.info_view');
      if (infoDiv.css('display') === 'none') {
        infoDiv.replaceWith(annoWin.createInfoDiv(annotation));
        infoDiv.show();
      } else {
        infoDiv.hide();
      }
    });
  }
}

const annotationTemplate = Handlebars.compile([
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

const headerTemplate = Handlebars.compile([
  '<div class="annowin_group_header">{{text}}',
  '</div>'
].join(''));

const infoTemplate = Handlebars.compile([
  '<div class="info_view">',
  '  <span class="anno_info_label">On:<span>',
  '  <span class="anno_info_value">{{{on}}}</span>',
  '</div>'
].join(''));

