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
   *   container: <object>
   *   annotations: <object[]>,
   *   layerId: <string>,
   *   canvas: <object>,
   *   annotationToc: <object>,
   *   pageNum: <number> // for debugging
   * }
   *
   * @param {object} options
   */
  render(options) {
    let count = 0;
    const canvasHeader = jQuery(canvasHeaderTemplate({
      text: options.canvas.label + ' (' + options.pageNum + ')'
    }));
    options.container.append(canvasHeader);

    if (options.annotationToc) {
      this.renderToc(options);
    } else {
      this.renderDefault(options);
    }
    /*
    if (count === 0) {
      canvasHeader.hide();
    }
    */
  }

  renderDefault(options) {
    logger.debug('AnnotationPageRenderer#renderDefault options:', options);
    let count = 0;

    for (let annotation of options.annotations) {
      try {
        if (options.layerId === annotation.layerId) {
          ++count;
          const annoElem = this.options.annotationRenderer
            .createAnnoElem(annotation, options);
          options.container.append(annoElem);
        }
      } catch (e) {
        logger.error('ERROR AnnotationListRenderer#render', e);
        throw e;
      }
    }
    return count;
  }

  renderToc(options) {
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
}

const canvasHeaderTemplate = Handlebars.compile([
  '<div class="annowin-canvas-header">{{text}}',
  '</div>'
].join(''));

