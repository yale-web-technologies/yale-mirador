import {Anno, annoUtil} from '../../../import';
import AnnotationEditor from '../../annotation-editor';
import getLogger from '../../../util/logger';
import util from '../../../util/util';

const logger = getLogger();

export default class AnnotationRenderer {
  constructor(options) {
    this.options = Object.assign({
      annotationWindow: null,
      state: null // global state store
    }, options);

    this.layerIndexMap = this.options.state.getTransient('layerIndexMap');
    this.hideTags = this.options.state.getTransient('hideTagsInAnnotation');
  }

  /**
   * options: {
   *   pageElem: <object>,
   *   canvasId: <string>,
   *   isEditor: <bool>
   * }
   *
   * @param {object} annotation
   * @param {object} options
   */
  createAnnoElem(annotation, options) {
    //logger.debug('AnnotationRenderer#createAnnoElem anno:', annotation);
    const anno = Anno(annotation);
    const content = anno.bodyText;
    const tags = anno.tags;
    const tagsHtml = this.getTagsHtml(tags);
    const style = anno.bodyStyle;

    const annoHtml = annotationTemplate({
      content: content,
      tags: tagsHtml,
      isEditor: options.isEditor,
      orderable: options.isEditor
    });

    const layerIndex = this.layerIndexMap[annotation.layerId];
    const annoElem = jQuery(annoHtml);
    const contentElem = annoElem.find('.content');
    util.setTextDirectionClass(contentElem, style);

    const menuBar = annoElem.find('.menu_bar');
    const annoOrderButtonsRow = options.pageElem.find('.annowin_temp_row');

    annoElem.data('annotationId', annotation['@id']);
    annoElem.data('canvasId', options.canvasId);
    annoElem.data('annoOrderButtonsRow', annoOrderButtonsRow);

    annoElem.find('.ui.dropdown').dropdown({ direction: 'downward' });

    menuBar.addClass('layer_' + layerIndex % 10);
    if (annotation.on['@type'] == 'oa:Annotation') { // annotation of annotation
      menuBar.addClass('targeting_anno');
    } else {
      menuBar.removeClass('targeting_anno');
    }

    if (this.hideTags) {
      annoElem.find('.tags').hide();
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
    const annoWin = this.options.annotationWindow;
    const nav = annoWin.getAnnoListNav();

    annoElem.focus(function(event) {
      annoWin.clearAnnotationHighlights();
      nav.setPageByCanvasId(annoElem.data('canvasId'));

      jQuery.publish('ANNOWIN_ANNOTATION_FOCUSED', [{
        annotationWindowId: annoWin.getId(),
        annotation: annotation,
        canvasId: jQuery(this).data('canvasId'),
        imageWindowId: annoWin.getImageWindowId(),
        offset: annoElem.position().top
      }]);
    });

    annoElem.find('.annotate').click(function (event) {
      event.stopPropagation();

      const imageWindow = annoWin.getImageWindowProxy();
      const dialogElement = jQuery('#ym_annotation_dialog');
      const editor = new AnnotationEditor({
        parent: dialogElement,
        windowId: annoWin.getImageWindowId(),
        mode: 'create',
        targetAnnotation: annotation,
        endpoint: annoWin.endpoint,
        saveCallback: function(annotation) {
          try {
            dialogElement.dialog('close');
            imageWindow.getAnnotationsList().push(annotation);
            annoWin.miradorProxy.publish('ANNOTATIONS_LIST_UPDATED',
              { windowId: imageWindow.getWindowId(), annotationsList: imageWindow.getAnnotationsList() });
          } catch(e) {
            logger.error('AnnotationRenderer saving from "annotate" failed:', e);
          }
        },
        cancelCallback: function() {
          dialogElement.dialog('close');
        }
      });

      dialogElement.dialog({ // jQuery-UI dialog
        title: 'Create annotation',
        modal: true,
        draggable: true,
        dialogClass: 'no_close',
        width: 400
      });
      editor.show();
    });

    annoElem.find('.edit').click(function(event) {
      event.stopPropagation();

      const editor = new AnnotationEditor({
        parent: annoElem,
        windowId: annoWin.getImageWindowId(),
        mode: 'update',
        endpoint: annoWin.endpoint,
        annotation: annotation,
        saveCallback: function(annotation, content) {
          if (annoWin.currentLayerId === annotation.layerId) {
            const normalView = annoElem.find('.normal_view');
            const contentElem = normalView.find('.content');
            contentElem.html(content);
            util.setTextDirectionClass(contentElem, Anno(annotation).bodyStyle);
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
      event.stopPropagation();

      if (window.confirm('Do you really want to delete the annotation?')) {
        annoWin.miradorProxy.publish('annotationDeleted.' + annoWin.getImageWindowProxy().getWindowId(), [annotation['@id']]);
      }
    });

    annoElem.find('.up.icon').click(function(event) {
      event.stopPropagation();
      const sibling = annoElem.prev();

      if (sibling.length > 0 && sibling.hasClass('annowin_anno')) {
        annoWin.fadeDown(annoElem, function() {
          annoElem.after(sibling);
          annoWin.fadeUp(annoElem, function() {
            annoElem.data('annoOrderButtonsRow').show();
          });
        });
      }
    });

    annoElem.find('.down.icon').click(function(event) {
      event.stopPropagation();
      const sibling = annoElem.next();

      if (sibling.length > 0 && sibling.hasClass('annowin_anno')) {
        annoWin.fadeUp(annoElem, function() {
          annoElem.before(sibling);
          annoWin.fadeDown(annoElem, function() {
            annoElem.data('annoOrderButtonsRow').show();
          });
        });
      }
    });
  }
}

const annotationTemplate = Handlebars.compile([
  '<div class="annowin_anno" tabindex="-1">',
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
