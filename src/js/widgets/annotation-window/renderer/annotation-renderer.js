import {Anno, annoUtil} from '../../../import';
import AnnotationEditor from '../../annotation-editor';
import getLogger from '../../../util/logger';
import util from '../../../util/util';

const logger = getLogger();

export default class AnnotationRenderer {
  constructor(options) {
    this._annoWin = options.annotationWindow;
    this._state = options.state;

    this.layerIndexMap = this._state.getTransient('layerIndexMap');
    this.hideTags = this._state.getTransient('hideTagsInAnnotation');
    this._miradorProxy = this._annoWin.getMiradorProxy();
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

    const annoElem = jQuery(annoHtml);
    if (this._state.getTransient('textDirection') === 'vertical-rl') {
      annoElem.addClass('vertical-layout');
    }

    const contentElem = annoElem.find('.content');
    util.setTextDirectionClass(contentElem, style);

    const menuBar = annoElem.find('.menu_bar');
    //const annoOrderButtonsRow = options.pageElem.find('.annowin_temp_row');

    annoElem.data('annotationId', annotation['@id']);
    annoElem.data('canvasId', options.canvasId);

    //annoElem.data('annoOrderButtonsRow', annoOrderButtonsRow);
    annoElem.data('pageElem', options.pageElem);

    const ddElem = annoElem.find('.ui.dropdown');

    ddElem.dropdown({ direction: 'downward' });
    ddElem.click(function(event) {
      event.stopPropagation(); // prevent _FOCUSED event from being published by clicking on the dropdown
    });

    const layerIndex = this.layerIndexMap[annotation.layerId];
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
    const annoWin = this._annoWin;
    const nav = annoWin.getAnnoListNav();

    annoElem.data('annotation', annotation);

    annoElem.click(function(event) {
      annoWin.select(jQuery(this));
    });

    annoElem.find('.annotate').click(function (event) {
      const imageWindow = annoWin.getImageWindowProxy();
      const dialogElement = jQuery('#ym_annotation_dialog');
      const editor = new AnnotationEditor({
        parent: dialogElement,
        windowId: annoWin.getImageWindowId(),
        mode: 'create',
        targetAnnotation: annotation,
        endpoint: annoWin.endpoint,
        saveCallback: annotation => {
          try {
            dialogElement.dialog('close');
            imageWindow.getAnnotationsList().push(annotation);
            _this._miradorProxy.publish('ANNOTATIONS_LIST_UPDATED',
              { windowId: imageWindow.getWindowId(), annotationsList: imageWindow.getAnnotationsList() });
          } catch(e) {
            logger.error('AnnotationRenderer saving from "annotate" failed:', e);
            annoWin.reloadIfDirty();
          }
        },
        cancelCallback: () => {
          dialogElement.dialog('close');
          annoWind.reloadIfDirty();
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
      const editor = new AnnotationEditor({
        parent: annoElem,
        windowId: annoWin.getImageWindowId(),
        mode: 'update',
        endpoint: annoWin.endpoint,
        annotation: annotation,
        saveCallback: function(annotation, content) {
          if (annoWin.getCurrentLayerId() === annotation.layerId) {
            const normalView = annoElem.find('.normal_view');
            const contentElem = normalView.find('.content');
            contentElem.html(content);
            util.setTextDirectionClass(contentElem, Anno(annotation).bodyStyle);
            normalView.show();
            annoElem.data('editing', false);
          } else {
            annoElem.remove();
          }
          annoWin.reloadIfDirty();
        },
        cancelCallback: function() {
          annoElem.find('.normal_view').show();
          annoElem.data('editing', false);
          annoWin.reloadIfDirty();
        }
      });

      annoElem.data('editing', true);
      annoElem.find('.normal_view').hide();
      editor.show();
    });

    annoElem.find('.delete').click(function(event) {
      if (window.confirm('Do you really want to delete the annotation?')) {
        _this._miradorProxy.publish('annotationDeleted.' + annoWin.getImageWindowProxy().getWindowId(), [annotation['@id']]);
      }
    });

    annoElem.find('.order-up').click(function(event) {
      event.stopPropagation();
      const sibling = annoElem.prev();

      if (sibling.length > 0 && sibling.hasClass('annowin_anno')) {
        annoWin.fadeDown(annoElem, function() {
          annoElem.after(sibling);
          annoWin.fadeUp(annoElem, function() {
            annoWin.showSaveOrderConfirmation(annoElem.data('pageElem'));
          });
        });
      }
    });

    annoElem.find('.order-down').click(function(event) {
      event.stopPropagation();
      const sibling = annoElem.next();

      if (sibling.length > 0 && sibling.hasClass('annowin_anno')) {
        annoWin.fadeUp(annoElem, function() {
          annoElem.before(sibling);
          annoWin.fadeDown(annoElem, function() {
            annoWin.showSaveOrderConfirmation(annoElem.data('pageElem'));
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
  //'            Action<i class="dropdown icon"></i>',
  '            <i class="fa fa-bars fa-fw"></i>',
  '            <div class="menu">',
  '              <div class="annotate item"><i class="fa fa-hand-o-left fa-fw"></i> Annotate</div>',
  '              <div class="edit item"><i class="fa fa-edit fa-fw"></i> {{t "edit"}}</div>',
  '              <div class="delete item"><i class="fa fa-times fa-fw"></i> {{t "delete"}}</div>',
  '            </div>',
  '          </div>',
  '          {{#if orderable}}',
  '            <div class="right menu">',
  '              <i class="order-down caret down icon"></i>',
  '              <i class="order-up caret up icon"></i>',
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
