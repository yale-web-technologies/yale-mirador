import annoUtil from './anno-util';

/**
 * Generate HTML elements for the annotations to be shown in the annotation window,
 * depending on the context.
 */
export default class AnnotationListRenderer {
  constructor(listElem) {
    this.listElem = listElem;
  }
  
  render(options) {
    console.log('AnnotationListRenderer#render');
    const _this = this;
    const listElem = jQuery('<div/>').addClass('annowin_list');
    const tocTagsteList = (options.tocTags[0] === 'all'); // true if current window will show all annotations of a sortable list.
    let count = 0;
    
    jQuery.each(options.annotationsList, function(index, annotation) {
      try {
        if (options.layerId === annotation.layerId) {
          if (options.tocTags[0] === 'all' || options.toc.matchHierarchy(annotation, options.tocTags)) {
            ++count;
            const annoElem = _this.createAnnoElem(annotation, listElem, options);
            listElem.append(annoElem);
          }
        }
      } catch (e) {
        console.log('ERROR AnnotationListRenderer#render ' + e);
        throw e;
      }
    });
    
    return [listElem, count];
  }
  
  createAnnoElem(annotation, listElem, options) {
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
    
    options.bindAnnoElemEventsCallback(annoElem, annotation);
    return annoElem;
  }
  
  getTagsHtml(tags) {
    var html = '';
    jQuery.each(tags, function(index, value) {
      html += '<span class="tag">' + value + '</span>';
    });
    return html;
  }
  
  setAnnotationItemInfo(annoElem, annotation) {
    var infoElem = annoElem.find('.annowin_info');
    if (annotation.on['@type'] == 'oa:Annotation') { // target: annotation
      infoElem.addClass('anno_on_anno');
    } else {
      infoElem.removeClass('anno_on_anno');
    }
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

