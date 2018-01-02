import getLogger from 'util/logger';

const logger = getLogger();

export default class AnnotationCache {
  constructor() {
    this._cache = {
      annosPerCanvas: {}
    };
    this._queues = {
      annosPerCanvas: []
    };
    this._maxCanvases = 5;
  }

  getAnnotationsPerCanvas(canvasId) {
    logger.debug('AnnotationCacheInMemory#getAnnotationsPerCanvas', canvasId);
    this._logState('get');
    return this._cache.annosPerCanvas[canvasId] || null;
  }

  setAnnotationsPerCanvas(canvasId, annotations) {
    logger.debug('AnnotationCacheInMemory#setAnnotationsPerCanvas canvasId:', canvasId, 'annotations:', annotations);
    const cache = this._cache.annosPerCanvas;
    const queue = this._queues.annosPerCanvas;

    this._logState('set before');

    if (cache[canvasId]) {
      // cache is already set
      return;
    }

    cache[canvasId] = annotations;
    queue.push(canvasId);

    if (queue.length > this._maxCanvases) {
      const canvasId = queue.shift();
      delete cache[canvasId];
    }

    this._logState('set after');
  }

  invalidateAllCanvases() {
    logger.debug('AnnotationCacheInMemory#invalidateAllCanvases');
    this._cache.annosPerCanvas = {};
    this._queues.annosPerCanvas = [];
  }

  invalidateCanvasId(canvasId) {
    logger.debug('AnnotationCacheInMemory#invalidateCanvasId canvasId:', canvasId);
    const queue = this._queues.annosPerCanvas;

    delete this._cache.annosPerCanvas[canvasId];
    queue.splice(queue.indexOf(canvasId), 1);
  }

  _logState(label) {
    logger.debug('Mem cache ' + label);
    logger.debug('cache:', this._cache);
    logger.debug('queues:', this._queues);
  }
}
