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
      this.appendAnnotationForTocNode(node);
      this.appendAnnotationsForChildNodes(node);
    });
    this.appendUnattachedAnnotations();
  }

  appendHeader(node) {
    const layerId = this.options.layerId;

    // We are distinguishing between leaf and non-leaf nodes to ensure
    // only one header will show over any set of annotations.

    if (nonLeafHasAnnotationsToShow(node, layerId) ||
      leafHasAnnotationsToShow(node, layerId))
    {
      const headerElem = this.createHeaderElem(node);
      this.options.container.append(headerElem);
    }
  }

  appendAnnotationForTocNode(node) {
    logger.debug('AnnotationTocRenderer#appendAnnotationsForTocNode node:', node);
    if (node.annotation && node.annotation.layerId === this.options.layerId) {
      const renderer = this.options.annotationRenderer;
      const annoElem = renderer.createAnnoElem(node.annotation, {
        pageElem: this.options.container,
        canvasId: this.options.canvasId,
        isEditor: this._isEditor
      });
      this.options.container.append(annoElem);
    } else {
      //logger.debug('AnnotationTocRenderer#appendAnnotationForTocNode no annotation is associated with node', node, 'and layer', this.options.layerId);
    }
  }

  appendAnnotationsForChildNodes(node) {
    logger.debug('AnnotationTocRenderer#appendAnnotationsForChildNodes children:', node.childAnnotations);
    const renderer = this.options.annotationRenderer;
    const pageElem = this.options.container;

    for (let annotation of node.childAnnotations) {
      if (annotation.layerId === this.options.layerId) {
        let annoElem = renderer.createAnnoElem(annotation, {
          pageElem: pageElem,
          canvasId: pageElem.data('canvasId'),
          isEditor: this._isEditor
        });
        this.options.container.append(annoElem);
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
    const text = node.cumulativeLabel;
    const headerHtml = headerTemplate({ text: text });
    const headerElem = jQuery(headerHtml);

    headerElem.data('tags', node.cumulativeTags);
    return headerElem;
  }
}

const headerTemplate = Handlebars.compile([
  '<div class="annowin_group_header">{{text}}',
  '</div>'
].join(''));

// True if node is a non-leaf and there are annotations to show under the header
function nonLeafHasAnnotationsToShow(node, layerId) {
  const numChildNodes = Object.keys(node.childNodes).length;

  return numChildNodes > 0 && // non-leaf
    (node.annotation && node.annotation.layerId === layerId || // the annotation for this node matches the current layer so it will show
    hasChildAnnotationsToShow(node, layerId)); // there are annotations that target this non-leaf node directly
}

// True if node is a leaf and there are annotations to show under the header
function leafHasAnnotationsToShow(node, layerId) {
  const numChildNodes = Object.keys(node.childNodes).length;

  return numChildNodes === 0 && // leaf
    node.layerIds.has(layerId); // node is a leaf and there are annotations with matching layer
}

function hasChildAnnotationsToShow(node, layerId) {
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
