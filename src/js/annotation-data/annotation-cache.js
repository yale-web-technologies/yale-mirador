import {Anno, annoUtil} from '../import';
import getLogger from '../util/logger';
import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';

const logger = getLogger();

export default function getAnnotationCache() {
  if (!instance) {
    instance = new AnnotationCache();
    instance.clear(); // invalidate all data everytime app restarts
    return instance.init();
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
          logger.error('AnnotationCache#constructor promise rejected - ', reason);
          reject(this);
        });
      } else {
        reject(this);
        logger.info('IndexedDB is not available on this browser.');
      }
    });
  }

  /**
   * @returns {object} a Promise
   */
  _initIndexedDb() {
    const _this = this;
    this._db = new Dexie(this._dbName).on('versionchange', function(event) {
      logger.debug('versionchange ' + event.newVersion);
    });

    this._db.version(1).stores({
      layers: 'id,jsonData,timestamp',
      annosPerCanvas: 'canvasId,jsonData,timestamp'
    });
    return this._db.open().catch(function(e) {
      logger.error('AnnotationCache#setupIndexDb open failed: ' + e);
      _this._valid = false;
    });
  }

  /**
   * @returns {object} a Promise
   */
  clear() {
    const _this = this;
    logger.debug('AnnotationCache#clear');
    return (new Dexie(this._dbName)).delete().catch(function(e) {
      logger.error('AnnotationCache#clear exception: ' + e.stack);
    });
  }

  /**
   * @returns {object} a Promise
   */
  emptyTable(name) {
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
    return this._db.layers.where('id').equals(1).first(function (row) {
      const data = (row !== undefined) ? row.jsonData : null;
      return (data instanceof Array) ? data : [];
    });
  }

  /**
   * @returns {object} a Promise
   */
  setLayers(layersJson) {
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
    const table = this._db.annosPerCanvas;
    const coll = this._db.annosPerCanvas.where('canvasId').equals(canvasId);
    const nowMS = new Date().valueOf();

    if (coll.count() === 0) {
      return table.add({ canvasId: canvasId, jsonData: data, timestamp: nowMS });
    } else {
      return table.put({ canvasId: canvasId, jsonData: data, timestamp: nowMS });
    }
  }

  deleteAnnotationsPerCanvas(canvasId) {
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
    return this.emptyTable('annosPerCanvas');
  }

  invalidateCanvasId(canvasId) {
    logger.debug('CACHE INVALIDATED: ' + canvasId);
    return this.deleteAnnotationsPerCanvas(canvasId);
  }

  invalidateAnnotation(annotation, annoIsNew) {
    return this.invalidateAnnotationId(annotation['@id']);
  }

  async invalidateAnnotationId(annotationId) {
    logger.debug('invalidateAnnotationId: ' + annotationId);
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
