import getLogger from '../../../util/logger';
import session from '../../../session';

const logger = getLogger();

/**
 * Render annotations  when an annotation ToC structure is available.
 */
export default class AnnotationTocRenderer {
  constructor(options) {
    this.options = Object.assign({
      container: null,
      canvasId: null,
      layerId: null,
      toc: null,
      annotationRenderer: null
    }, options);

    logger.debug('AnnotationTocRenderer#constructor options:', options);

    this._isEditor = session.isEditor();
  }

  render() {
    logger.debug('AnnotationTocRenderer#render');

    this.options.toc.walk(node => {
      if (node.isRoot) {
        return; // do nothing with root node
      }
      this.appendHeader(node);
      this.appendAnnotations(node);
    });
    this.appendUnattachedAnnotations();
  }

  appendHeader(node) {
    const layerId = this.options.layerId;

    // We are distinguishing between leaf and non-leaf nodes to ensure
    // only one header will show over any set of annotations.

    if (nodeHasAnnotationsToShow(node, layerId)) {
      const headerElem = this.createHeaderElem(node);
      this.options.container.append(headerElem);
    }
  }

  appendAnnotations(node) {
    //logger.debug('AnnotationTocRenderer#appendAnnotations node:', node);
    const renderer = this.options.annotationRenderer;
    const pageElem = this.options.container;

    for (let anno of node.annotations) {
      if (anno.layerId === this.options.layerId) {
        let annoElem = renderer.createAnnoElem(anno, {
          pageElem: pageElem,
          canvasId: pageElem.data('canvasId'),
          isEditor: this._isEditor
        });
        pageElem.append(annoElem);
      }
    }
  }

  appendUnattachedAnnotations() {
    logger.debug('AnnotationTocRenderer#appendUnattachedAnnotations');
    const renderer = this.options.annotationRenderer;

    if (this.options.toc.numUnassigned() > 0) {
      /*
      const unassignedHeader = jQuery(headerTemplate({ text: 'Unassigned' }));
      let count = 0;
      this.options.container.append(unassignedHeader);
      */
      for (let annotation of this.options.toc.unassigned()) {
        logger.error('AnnotationTocRenderer#appendUnattachedAnnotations unassigned:', annotation);
        /*
        let annoElem = renderer.createAnnoElem(annotation, {
          annotations: this.options.annotations,
          isEditor: this._isEditor
        });
        this.options.container.append(annoElem);
        ++count;
        */
      }
      /*
      if (count === 0) {
        unassignedHeader.hide();
      }
      */
    }
  }

  createHeaderElem(node) {
    const headerHtml = headerTemplate({ text: node.label });
    const headerElem = jQuery(headerHtml)
      .addClass('header-level-' + node.tags.length);

    headerElem.data('tags', node.tags);
    return headerElem;
  }
}

const headerTemplate = Handlebars.compile([
  '<div class="annowin_group_header">{{text}}',
  '</div>'
].join(''));

function nodeHasAnnotationsToShow(node, layerId) {
  for (let anno of node.annotations) {
    if (anno.layerId === layerId) {
      return true;
    }
  }
  return false;
}
