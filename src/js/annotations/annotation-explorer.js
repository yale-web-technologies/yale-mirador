import {Anno, annoUtil} from 'import';
import AnnotationToc from './annotation-toc';

let logger = null;

/**
 * This class may seem redundant but we wanted to try a new model
 * that could possibly replace Mirador's endpoint interface while
 * supporting the current functionalities.
 */
export default class AnnotationExplorer {
  constructor(options) {
    this.options = jQuery.extend({
      dataSource: null,
      tocSpec: null,
      logger: { debug: () => null, info: () => null, error: () => null }
    }, options);
    logger = this.options.logger;
    logger.debug('AnnotationExplorer#constructor options:', options);
    this.AnnotationToc = null;
  }

  getLayers() {
    return this.options.dataSource.getLayers();
  }

  /**
   * Options: {
   *   canvasId: <string>, // required
   *   layerId: <string> // optional
   * }
   *
   * @param {object} options
   */
  async getAnnotations(options) {
    //logger.debug('AnnotationExplorer#getAnnotations options:', options);

    if (!options.canvasId) {
      const msg = 'AnnotationExplorer#getAnnotations missing options.canvasId';
      logger.error(msg);
      throw { code: 0, message: msg };
    }

    const annotations = await this.options.dataSource.getAnnotations(options)
    .catch(e => {
      throw {
        code: e.code,
        message: 'ERROR AnnotationExplorer#getAnnotations dataSource.getAnnotations failed: \n' + e.message
      };
    });

    this._generateInverseTargets(annotations);
    return annotations;
  }

  createAnnotation(annotation) {
    return this.options.dataSource.createAnnotation(annotation);
  }

  updateAnnotation(annotation) {
    return this.options.dataSource.updateAnnotation(annotation);
  }

  deleteAnnotation(annotationId) {
    return this.options.dataSource.deleteAnnotation(annotationId);
  }

  updateAnnotationListOrder(canvasId, layerId, annoIds) {
    logger.debug('AnnotationExplorer#updateAnnotationListOrder');
    return this.options.dataSource.updateAnnotationListOrder(canvasId, layerId, annoIds);
  }

  getAnnotationToc() {
    return this.annotationToc;
  }

  reloadAnnotationToc(spec, annotations) {
    this.annotationToc = new AnnotationToc(spec, annotations);
    logger.debug('AnnotationExplorer#reloadAnnotationToc toc:', this.annotationToc.annoHierarchy);
  }

  _generateInverseTargets(annotations) {
    const annoMap = {};

    for (let anno of annotations) {
      annoMap[anno['@id']] = Anno(anno);
    }

    for (let anno of annotations) {
      for (let target of Anno(anno).targets) {
        let targetId = target.full;
        if (annoMap[targetId]) {
          annoMap[targetId].addInverseTarget(anno);
        }
      }
    }
  }
}
