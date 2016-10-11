import getMiradorProxyManager from '../mirador-proxy/mirador-proxy-manager';
import annoUtil from './anno-util';

export default function getAnnotationCache() {
  if (!instance) {
    return new AnnotationCache();
  } else {
    return new Promise(function(resolve, reject) {
      instance.isValid() ? resolve(instance) : reject(instance);
    });
  }
};

let instance = null;

class AnnotationCache {
  constructor() {
    const _this = this;
    this._dbName = 'anno_cache';
    this._valid = false;
    this._expiresInMS = 2 * 60 * 60 * 1000; // milliseconds
    
    return new Promise(function(resolve, reject) {
      if (window.indexedDB) {
        _this.clear().then(function() {
          return _this.init();
        }).then(function() {
          _this._valid = true;
          resolve(_this);
        });
      } else {
        reject(_this);
        console.log('IndexedDB is not available on this browser.');
      }
    });
  }
  
  /**
   * @returns {object} a Promise
   */
  init() {
    const _this = this;
    this._db = new Dexie(this._dbName).on('versionchange', function(event) {
      console.log('versionchange ' + event.newVersion);
    });
    
    this._db.version(1).stores({
      layers: 'id,jsonData,timestamp',
      annosPerCanvas: 'canvasId,jsonData,timestamp'
    });
    return this._db.open().catch(function(e) {
      console.log('ERROR AnnotationCache#setupIndexDb open failed: ' + e);
      _this._valid = false;
    });
  }
  
  /**
   * @returns {object} a Promise
   */
  clear() {
    console.log('AnnotationCache#clear');
    return (new Dexie(this._dbName)).delete().catch(function(e) {
      console.log('AnnotationCache#clear exception: ' + e.stack);
    });
  }
  
  /**
   * @returns {object} a Promise
   */
  emptyTable(name) {
    const table = this._db.table(name);
    return this._db.transaction('rw', table, function() {
      table.each(function (item, cursor) {
        console.log('deleting ' + cursor.key);
        table.delete(cursor.key).catch(function(e) {
          console.log('ERROR deleting from table ' + name + ': ' + e);
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
            console.log('ERROR AnnotatinCache#setLayers update failed: ' + e);
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
        console.log('rec.timestamp: ' + rec.timestamp);
        console.log('now: ' + nowMS);
        console.log('exp: ' + _this._expiresInMS);
        console.log('diff: ' + (nowMS - rec.timestamp));
        console.log('test: ' + (rec.timestamp > nowMS - _this._expiresInMS));
        return rec.timestamp > new Date().valueOf() - _this._expiresInMS;
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
    const table = this._db.annosPerCanvas;
    const coll = table.where('canvasId').equals(canvasId);
    return coll.delete().catch(function(e) {
      console.log('ERROR AnnotationCache#deleteAnnotationsPerCanvas failed to delete canvasId: ' + canvasId);
    });
  }
  
  isValid() {
    return this._valid;
  }
  
  invalidateCanvasId(canvasId) {
    console.log('CACHE INVALIDATED: ' + canvasId);
    return this.deleteAnnotationsPerCanvas(canvasId);
  }
  
  invalidateAnnotation(annotation) {
    const canvasIdSet = new Set();
    const targetCanvasIds = annoUtil.getFinalTargetCanvasIds(annotation);
    
    for (let canvasId of targetCanvasIds) {
      canvasIdSet.add(canvasId);
    }
    for (let canvasId of canvasIdSet) {
      this.invalidateCanvasId(canvasId);
    }
  }
  
  invalidateAnnotationId(annotationId) {
    console.log('invalidateAnnotationId: ' + annotationId);
    const proxyMgr = getMiradorProxyManager();
    const canvasIdSet = new Set();
    for (let windowProxy of proxyMgr.getAllWindowProxies()) {
      for (let annotation of windowProxy.getAnnotationsList()) {
        if (annotation['@id'] === annotationId) {
          const targetCanvasIds = annoUtil.getFinalTargetCanvasIds(annotation);
          console.log('targetCanvasIds: ' + targetCanvasIds);
          for (let canvasId of targetCanvasIds) {
            canvasIdSet.add(canvasId);
          }
        }
      }
    }
    for (let canvasId of canvasIdSet) {
      this.invalidateCanvasId(canvasId);
    }
  }
}
