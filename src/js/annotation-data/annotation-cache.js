import {Anno, annoUtil} from '../import';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';

const logger = getLogger();

export default function getAnnotationCache() {
  if (!instance) {
    instance = new AnnotationCache();
    return instance.deleteDb().then(() => {
      return instance.init();
    });
  } else {
    return new Promise(function(resolve, reject) {
      instance.isValid() ? resolve(instance) : resolve(null);
    });
  }
};

let instance = null;

class AnnotationCache {
  constructor() {
    this._dbName = 'anno_cache';
    this._valid = false;
    this._expiresInMS = 2 * 60 * 60 * 1000; // milliseconds
  }

  init() {
    return new Promise((resolve, reject) => {
      if (window.indexedDB) {
        this._initIndexedDb().then(() => {
          this._valid = true;
          resolve(this);
        }).catch(function(reason) {
          this._valid = false;
          resolve(this);
        });
      } else {
        logger.info('IndexedDB is not available on this browser.');
        this._valid = false;
        resolve(this);
      }
    });
  }

  /**
   * @returns {object} a Promise
   */
  _initIndexedDb() {
    logger.debug('AnnotationCache#_initIndexedDb');

    this._db = new Dexie(this._dbName);
    this._db.version(1).stores({
      layers: 'id,jsonData,timestamp',
      annosPerCanvas: 'canvasId,jsonData,timestamp'
    });

    return this._db.open().catch(e => {
      const msg = 'AnnotationCache#setupIndexDb open failed: ' + e;
      logger.error(msg);
      throw msg;
    });
  }

  /**
   * @returns {object} a Promise
   */
  deleteDb() {
    logger.debug('AnnotationCache#deleteDb');
    return Dexie.delete(this._dbName);
  }

  /**
   * @returns {object} a Promise
   */
  emptyTable(name) {
    logger.debug('AnnotationCache#emptyTable', name);
    const _this = this;
    const table = this._db.table(name);
    return this._db.transaction('rw', table, function() {
      table.each(function (item, cursor) {
        logger.debug('AnnotationCache#emptyTable deleting', cursor.key);
        table.delete(cursor.key).catch(function(e) {
          logger.error('AnnotationCache#emptyTable deleting from table ' + name + ': ' + e);
        });
      });
    });
  }

  /**
   * @returns {object} a Promise
   */
  getLayers() {
    logger.debug('AnnotationCache#getLayers');
    return this._db.layers.where('id').equals(1).first(function (row) {
      const data = (row !== undefined) ? row.jsonData : null;
      return (data instanceof Array) ? data : [];
    });
  }

  /**
   * @returns {object} a Promise
   */
  setLayers(layersJson) {
    logger.debug('AnnotationCache#setLayers', layersJson);
    const _this = this;
    return this.emptyTable('layers')
      .then(function() {
        return _this._db.layers.add({ id: 1, jsonData: layersJson})
          .catch(function(e) {
            logger.error('AnnotatinCache#setLayers update failed: ' + e);
            throw e;
          });
      });
  }

  /**
   * @returns {object} a Promise
   */
  getAnnotationsPerCanvas(canvasId) {
    logger.debug('AnnotationCache#getAnnotationsPerCanvas', canvasId);
    const _this = this;
    const coll = this._db.annosPerCanvas.where('canvasId').equals(canvasId)
      .and(function(rec) {
        const nowMS = new Date().valueOf();
        logger.debug('AnnotationCache#getAnnotationsPerCanvas expiration test: ' + (nowMS <  rec.timestamp + _this._expiresInMS));
        return nowMS < rec.timestamp  + _this._expiresInMS;
      });
    return coll.first(function(row) {
      return row ? row.jsonData : null;
    });
  }

  /**
   * @returns {object} a Promise
   */
  setAnnotationsPerCanvas(canvasId, data) {
    logger.debug('AnnotationCache#setAnnotationsPerCanvas canvas:', canvasId, 'data:', data);
    const table = this._db.annosPerCanvas;
    const coll = this._db.annosPerCanvas.where('canvasId').equals(canvasId);
    const nowMS = new Date().valueOf();

    return coll.count().then(count => {
      if (count === 0) {
        console.log('adding', { canvasId: canvasId, jsonData: data, timestamp: nowMS });
        return table.add({ canvasId: canvasId, jsonData: data, timestamp: nowMS });
      } else {
        console.log('putting', count);
        return table.put({ canvasId: canvasId, jsonData: data, timestamp: nowMS });
      }
    });
  }

  deleteAnnotationsPerCanvas(canvasId) {
    logger.debug('AnnotationCache#deleteAnnotationsPerCanvas canvasId:', canvasId);
    const _this = this;
    const table = this._db.annosPerCanvas;
    const coll = table.where('canvasId').equals(canvasId);
    return coll.delete().catch(function(e) {
      logger.error('AnnotationCache#deleteAnnotationsPerCanvas failed to delete canvasId: ' + canvasId);
    });
  }

  isValid() {
    return this._valid;
  }

  invalidateAllCanvases() {
    logger.debug('AnnotationCache#invalidateAllCanvases');
    return this.emptyTable('annosPerCanvas');
  }

  invalidateCanvasId(canvasId) {
    logger.debug('AnnotationCache#invalidateCanvasId canvasId:', canvasId);
    return this.deleteAnnotationsPerCanvas(canvasId);
  }

  invalidateAnnotation(annotation, annoIsNew) {
    logger.debug('AnnotationCache#invalidateAnnotation annotation:', annotation, 'annoIsNew:', annoIsNew);
    return this.invalidateAnnotationId(annotation['@id']);
  }

  async invalidateAnnotationId(annotationId) {
    logger.debug('AnnotationCache#invalidateAnnotationId' + annotationId);
    const proxyMgr = getMiradorProxyManager();
    const canvasIdSet = new Set();
    for (let windowProxy of proxyMgr.getAllWindowProxies()) {
      let annotations = windowProxy.getAnnotationsList();
      for (let annotation of annotations) {
        if (annotation['@id'] === annotationId) {
          const targetCanvasIds = this._getTargetCanvasIds(annotation, annotations);
          for (let canvasId of targetCanvasIds) {
            canvasIdSet.add(canvasId);
          }
        }
      }
    }
    for (let canvasId of canvasIdSet) {
      await this.invalidateCanvasId(canvasId);
    }
  }

  _getTargetCanvasIds(annotation, annotations) {
    const $anno = Anno(annotation);
    const result = [];
    const annoMap = {};

    for (let anno of annotations) {
      annoMap[anno['@id']] = anno;
    }

    let targetAnnos = annoUtil.findTransitiveTargetAnnotations($anno, annoMap);

    for (let targetAnno of targetAnnos) {
      for (let target of targetAnno.targets) {
        if (annoUtil.targetIsAnnotationOnCanvas(target)) {
          result.push(target.full);
        }
      }
    }
    return result;
  }
}
