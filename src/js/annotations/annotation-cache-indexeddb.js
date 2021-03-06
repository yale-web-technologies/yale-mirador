import {Anno, annoUtil} from 'import';
import getLogger from 'util/logger';
import getMiradorProxyManager from 'mirador-proxy/mirador-proxy-manager';

const logger = getLogger();

export default class AnnotationCacheIndexeddb {
  constructor() {
    // Not using indexddb any more. As of 10/26/2017.
    // It is too unstable on Safari.
    this._valid = false;
    return;

    this._dbName = 'anno_cache';
    this._valid =  window.indexedDB ? true : false;
    this._expiresInMS = 2 * 60 * 60 * 1000; // milliseconds
    this._inMemoryCache = {};
  }

  /**
   * @returns {object} a Promise
   */
  init() {
    logger.debug('AnnotationCacheINdexeddb#_init');

    this._db = new Dexie(this._dbName);
    this._db.version(1).stores({
      layers: 'id,jsonData,timestamp',
      annosPerCanvas: 'canvasId,jsonData,timestamp'
    });

    return this._db.open().catch(e => {
      this._valid = false;
      logger.error('AnnotationCache#setupIndexDb open failed:', e);
    });
  }

  isValid() {
    return this._valid;
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
    return this._emptyTable('layers')
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
    const row = { canvasId: canvasId, jsonData: data, timestamp: nowMS };

    return table.put(row)
    .catch(reason => {
      logger.error('AnnotationCache#setAnnotationsPerCanvas put failed for', row, ': ' + reason);
      this._valid = false;
    });
  }

  invalidateAllCanvases() {
    logger.debug('AnnotationCache#invalidateAllCanvases');
    return this._emptyTable('annosPerCanvas');
  }

  invalidateCanvasId(canvasId) {
    logger.debug('AnnotationCache#invalidateCanvasId canvasId:', canvasId);
    return this._deleteAnnotationsPerCanvas(canvasId);
  }

 /**
   * @returns {object} a Promise
   */
  _emptyTable(name) {
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

  _deleteAnnotationsPerCanvas(canvasId) {
    logger.debug('AnnotationCache#deleteAnnotationsPerCanvas canvasId:', canvasId);
    const _this = this;
    const table = this._db.annosPerCanvas;
    const coll = table.where('canvasId').equals(canvasId);
    return coll.delete().catch(function(e) {
      logger.error('AnnotationCache#deleteAnnotationsPerCanvas failed to delete canvasId: ' + canvasId);
    });
  }
}
