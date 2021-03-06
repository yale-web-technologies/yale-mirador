import AnnotationToc from './annotation-toc';
import getLogger from 'util/logger';

const logger = getLogger();

export default class AnnotationTocCache {
  constructor(options) {
    this.options = Object.assign({
      tocSpec: null,
      annotationExplorer: null
    }, options);

    this._cache = {};
  }

  async getToc(canvasId) {
    logger.debug('AnnotationTocCache#getToc canvasId:', canvasId);

    if (!this._cache[canvasId]) {
      this._cache[canvasId] = await this.createToc(canvasId);
    } else {
      logger.debug('AnnotationTocCache#getToc hit cache', canvasId);
    }
    logger.debug('AnnotationTocCache getToc toc:', this._cache[canvasId]);
    return this._cache[canvasId];
  }

  async createToc(canvasId) {
    const annotations = await this.options.annotationExplorer.getAnnotations({canvasId: canvasId});
    const toc = new AnnotationToc(this.options.tocSpec, annotations, {logger: logger});
    return toc;
  }

  invalidate(canvasId) {
    delete this._cache[canvasId];
  }
}
