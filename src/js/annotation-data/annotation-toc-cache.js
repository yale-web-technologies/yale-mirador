import {AnnotationToc} from '../import';
import getLogger from '../util/logger';

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
    if (!this._cache[canvasId]) {
      this._cache[canvasId] = await this.createToc(canvasId);
    } else {
      logger.debug('AnnotationTocCache#getToc hit cache', canvasId);
    }
    return this._cache[canvasId];
  }

  async createToc(canvasId) {
    const annotations = await this.options.annotationExplorer.getAnnotations({canvasId: canvasId});
    const toc = new AnnotationToc(this.options.tocSpec, annotations, {logger: logger});
    return toc;
  }
}
