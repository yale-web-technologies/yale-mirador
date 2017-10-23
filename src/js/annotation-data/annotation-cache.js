import {Anno, annoUtil} from '../import';
import AnnotationCacheIndexeddb from './annotation-cache-indexeddb';
import AnnotationCacheInMemory from './annotation-cache-in-memory';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';

const logger = getLogger();

export default function getAnnotationCache() {
  return null; // XXXX

  if (!instance) {
    instance = new AnnotationCache();
    return instance.init();
  } else {
    return Promise.resolve(instance);
  }
};

let instance = null;

class AnnotationCache {
  constructor() {
    this._dbCache = new AnnotationCacheIndexeddb();
    this._memCache = new AnnotationCacheInMemory();
    this._valid = false;
    this._inMemoryCache = {};
  }

  async init() {
    if (this._dbCache.isValid()) {
      await this._dbCache.deleteDb();
      await this._dbCache.init();
    }
    return this;
  }

  /**
   * @returns {object} a Promise
   */
  async getAnnotationsPerCanvas(canvasId) {
    logger.debug('AnnotationCache#getAnnotationsPerCanvas', canvasId);
    let annotations = this._memCache.getAnnotationsPerCanvas(canvasId);

    if (annotations !== null) {
      logger.debug('mem cache hit', canvasId, annotations);
      return Promise.resolve(annotations);
    } else if (this._dbCache.isValid()) {
      annotations = await this._dbCache.getAnnotationsPerCanvas(canvasId);
      if (annotations !== null) {
        logger.debug('db cache hit', canvasId, annotations);
        this._memCache.setAnnotationsPerCanvas(canvasId, annotations);
      }
      return Promise.resolve(annotations);
    } else {
      return Promise.resolve(null);
    }
  }

  /**
   * @returns {object} a Promise
   */
  setAnnotationsPerCanvas(canvasId, data) {
    logger.debug('AnnotationCache#setAnnotationsPerCanvas canvas:', canvasId, 'data:', data);
    this._memCache.setAnnotationsPerCanvas(canvasId, data);
    if (this._dbCache.isValid()) {
      return this._dbCache.setAnnotationsPerCanvas(canvasId, data);
    } else {
      return Promise.resolve();
    }
  }

  invalidateAllCanvases() {
    logger.debug('AnnotationCache#invalidateAllCanvases');
    this._memCache.invalidateAllCanvases();
    if (this._dbCache.isValid()) {
      return this._dbCache.invalidateAllCanvases();
    }
  }

  invalidateCanvasId(canvasId) {
    logger.debug('AnnotationCache#invalidateCanvasId canvasId:', canvasId);
    this._memCache.invalidateCanvasId(canvasId);
    if (this._dbCache.isValid()) {
      return this._dbCache.invalidateCanvasId(canvasId);
    }
  }
}
