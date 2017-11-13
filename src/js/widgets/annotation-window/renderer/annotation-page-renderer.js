import AnnotationRenderer from './annotation-renderer';
import AnnotationTocRenderer from './annotation-toc-renderer';
import getLogger from 'util/logger';
import getStateStore from 'state-store';

const logger = getLogger();

export default class AnnotationPageRenderer {
  constructor(options) {
    this._annoWin = options.annotationWindow;
    this._annoRenderer = options.annotationRenderer;
    this._annoExplorer = options.annotationExplorer;
    this._state = options.state;

    if (!this._state) {
      this._state = getStateStore();
    }

    if (!this._annoRenderer) {
      this._annoRenderer = new AnnotationRenderer({
        annotationWindow: this._annoWin,
        state: this._state
      });
    }
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

    pageElem.data('canvasId', options.canvasId);
    pageElem.data('layerId', options.layerId);

    const pageHeader = pageElem.find('.page-header');
    pageHeader.text(options.canvasLabel);

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
      this._renderToc(pageElem, options);
    } else {
      this._renderDefault(pageElem, options);
    }
  }

  unload(pageElem) {
    pageElem.find('.annowin_group_header, .annowin_anno').remove();
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
  _renderDefault(pageElem, options) {
    logger.debug('AnnotationPageRenderer#_renderDefault options:', options);
    const canvasId = pageElem.data('canvasId');
    const layerId = pageElem.data('layerId');
    let count = 0;

    for (let annotation of options.annotations) {
      try {
        if (annotation.layerId === layerId) {
          ++count;
          const annoElem = this._annoRenderer
            .createAnnoElem(annotation, {
              pageElem: pageElem,
              canvasId: canvasId,
              isEditor: options.isEditor
            });
          pageElem.append(annoElem);
        }
      } catch (e) {
        logger.error('ERROR AnnotationPageRenderer#_renderDefault', e);
        throw e;
      }
    }
    return count;
  }

  _renderToc(pageElem, options) {
    logger.debug('AnnotationPageRenderer#_renderToc options:', options);
    const renderer = new AnnotationTocRenderer({
      container: pageElem,
      canvasId: pageElem.data('canvasId'),
      layerId: pageElem.data('layerId'),
      toc: options.annotationToc,
      annotationRenderer: this._annoRenderer
    });
    return renderer.render();
  }
}

const pageTemplate = Handlebars.compile([
  '<div class="ym-annotation-page page-{{pageNum}}">',
  '  <div class="page-header">{{text}}',
  '  </div>',
  '</div>'
].join(''));

