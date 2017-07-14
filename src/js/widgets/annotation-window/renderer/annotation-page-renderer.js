import AnnotationTocRenderer from './annotation-toc-renderer';
import getLogger from '../../../util/logger';

const logger = getLogger();

export default class AnnotationPageRenderer {
  constructor(options) {
    this.options = Object.assign({
      annotationWindow: null,
      annotationRenderer: null
    }, options);
  }

  /**
   * options: {
   *   layerId: <string>,
   *   canvasId: <string>,
   *   canvasLabel: <string>,
   *   pageNum: <number> // for debugging
   * }
   *
   * @param {object} options
   */
  createPageElement(options) {
    const html = pageTemplate({pageNum: options.pageNum});
    const pageElem = jQuery(html);
    const saveOrderButtonRow = pageElem.find('.annowin_temp_row');

    pageElem.data('canvasId', options.canvasId);
    pageElem.data('layerId', options.layerId);

    const pageHeader = pageElem.find('.page-header');
    pageHeader.text(options.canvasLabel + ' (' + options.pageNum + ')');

    saveOrderButtonRow.find('.ym_button.save').click(event => {
      this._saveAnnotationsOrder(pageElem);
      saveOrderButtonRow.hide();
    });
    saveOrderButtonRow.find('.ym_button.cancel').click(event => {
      saveOrderButtonRow.hide();
    });
    return pageElem;
  }

  /**
   * options: {
   *   annotations: <object[]>,
   *   canvasId: <string>,
   *   annotationToc: <object>,
   *   isEditor: <bool>,
   *   pageNum: <number> // for debugging
   * }
   *
   * @param {object} pageElem
   * @param {object} options
   */
  render(pageElem, options) {
    if (options.annotationToc) {
      this.renderToc(pageElem, options);
    } else {
      this.renderDefault(pageElem, options);
    }
  }

  /**
   * options: {
   *   annotations: <object[]>,
   *   canvasId: <string>,
   *   isEditor: <bool>
   * }
   *
   * @param {object} pageElem
   * @param {object} options
   */
  renderDefault(pageElem, options) {
    logger.debug('AnnotationPageRenderer#renderDefault options:', options);
    const canvasId = pageElem.data('canvasId');
    const layerId = pageElem.data('layerId');
    let count = 0;

    for (let annotation of options.annotations) {
      try {
        if (annotation.layerId === layerId) {
          ++count;
          const annoElem = this.options.annotationRenderer
            .createAnnoElem(annotation, {
              pageElem: pageElem,
              canvasId: canvasId,
              isEditor: options.isEditor
            });
          pageElem.append(annoElem);
        }
      } catch (e) {
        logger.error('ERROR AnnotationListRenderer#render', e);
        throw e;
      }
    }
    return count;
  }

  renderToc(pageElem, options) {
    logger.debug('AnnotationPageRenderer#renderToc options:', options);
    const renderer = new AnnotationTocRenderer({
      container: options.container,
      canvas: options.canvas,
      layerId: options.layerId,
      annotations: options.annotations, // all annotations on canvas
      toc: options.annotationToc,
      annotationRenderer: this.options.annotationRenderer
    });
    return renderer.render();
  }

  _saveAnnotationsOrder(pageElem) {
    const annoElems = pageElem.find('.annowin_anno');
    const annoIds = [];
    const canvasId = pageElem.data('canvasId');
    const layerId = pageElem.data('layerId');

    annoElems.each((index, value) => {
      var annoId = jQuery(value).data('annotationId');
      annoIds.push(annoId);
    });

    logger.debug('AnnotationPageRenderer#_saveAnnotationsOrder canvasId:', canvasId, 'layerId:', layerId, 'annoIds:', annoIds);

    this.options.annotationExplorer.updateAnnotationListOrder(canvasId, layerId, annoIds)
    .catch(reason => {
      _this.tempMenuRow.hide();
      const msg = 'AnnotationPageRenderer#_saveAnnotationsOrder updateAnnotationListOrder failed: ' + reason;
      throw msg;
    });
  }
}

const pageTemplate = Handlebars.compile([
  '<div class="ym-annotation-page page-{{pageNum}}">',
  '  <div class="page-header">{{text}}',
  '  </div>',
  '  <div class="annowin_temp_row">',
  '    <span class="ui small orange button ym_button save">Save new order</span>',
  '    <span class="ui small orange button ym_button cancel">Cancel</span>',
  '  </div>',
  '</div>'
].join(''));

